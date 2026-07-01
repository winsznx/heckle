import {
  createZGComputeNetworkBroker,
  InferenceVerifier,
  type InferenceServiceStructOutput,
} from "@0gfoundation/0g-compute-ts-sdk";
import type { Wallet } from "ethers";
import { ethers } from "ethers";
import OpenAI from "openai";
import { env } from "./env.js";

export type Broker = Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;

/** A chatbot service running in a TEE (TeeML) — what we want for attestation. */
const TEE_VERIFIABILITY = "TeeML";
const CHATBOT_SERVICE_TYPE = "chatbot";

export interface ProviderChoice {
  provider: string;
  model: string;
}

function isAlreadyError(err: unknown, ...needles: string[]): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

export async function getBroker(wallet: Wallet): Promise<Broker> {
  return createZGComputeNetworkBroker(wallet);
}

/**
 * Ensure the wallet has a funded ledger. `getLedger` throws when no ledger
 * exists yet; in that case we create one.
 */
export async function ensureLedger(broker: Broker): Promise<void> {
  let ledger: unknown;
  try {
    ledger = await broker.ledger.getLedger();
  } catch (err) {
    // The ledger already exists from prior runs and the provider sub-account is
    // funded. A transient getLedger failure must NOT trigger a fresh 3 0G
    // addLedger — assume it exists and let the funded sub-account carry inference.
    console.warn(
      "0G Compute: getLedger failed, assuming existing funded ledger:",
      err instanceof Error ? err.message : err,
    );
    return;
  }
  // Top up only if there is genuinely no available balance; tolerate failure.
  if (ledgerAvailable(ledger) < ethers.parseEther("0.5")) {
    try {
      await broker.ledger.depositFund(1);
    } catch (err) {
      console.warn(
        "0G Compute: depositFund skipped:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

function ledgerAvailable(ledger: unknown): bigint {
  const raw = (ledger as ReadonlyArray<unknown> | undefined)?.[1];
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "string" || typeof raw === "number") {
    try {
      return BigInt(raw);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

/**
 * Pick a TEE chatbot provider. Honours ZG_COMPUTE_PROVIDER/ZG_COMPUTE_MODEL env
 * overrides; otherwise selects the first acknowledged TeeML chatbot service.
 */
export async function pickProvider(broker: Broker): Promise<ProviderChoice> {
  const services: InferenceServiceStructOutput[] =
    await broker.inference.listService();

  if (env.ZG_COMPUTE_PROVIDER) {
    const override = services.find(
      (s) => s.provider.toLowerCase() === env.ZG_COMPUTE_PROVIDER!.toLowerCase(),
    );
    const model = env.ZG_COMPUTE_MODEL || override?.model;
    if (!model) {
      throw new Error(
        `0G Compute: ZG_COMPUTE_PROVIDER set but model unknown; set ZG_COMPUTE_MODEL.`,
      );
    }
    return { provider: env.ZG_COMPUTE_PROVIDER, model };
  }

  const tee = services.find(
    (s) =>
      s.verifiability === TEE_VERIFIABILITY &&
      s.serviceType === CHATBOT_SERVICE_TYPE,
  );
  const chatbot =
    tee ?? services.find((s) => s.serviceType === CHATBOT_SERVICE_TYPE);

  if (!chatbot) {
    throw new Error("0G Compute: no chatbot service available on the network");
  }

  return { provider: chatbot.provider, model: chatbot.model };
}

/** Acknowledge the provider signer and fund its inference sub-account. */
export async function prepareProvider(
  broker: Broker,
  provider: string,
): Promise<void> {
  try {
    await broker.inference.acknowledgeProviderSigner(provider);
  } catch (err) {
    if (!isAlreadyError(err, "already acknowledged", "acknowledged")) throw err;
  }

  try {
    await broker.ledger.transferFund(provider, "inference", ethers.parseEther("1"));
  } catch (err) {
    // Sub-account already funded, or acknowledge already consumed the deposit —
    // both fine. Only re-throw on genuinely unexpected errors.
    if (!isAlreadyError(err, "already", "insufficient")) throw err;
  }
}

export interface Attestation {
  /** The ZG-Res-Key the provider keyed this response's signature under. */
  chatId: string;
  /** Canonical signed text: `sha256(requestBody):sha256(responseBody)`. */
  signedText: string;
  /** 65-byte ECDSA signature (v = 27/28), EIP-191 personal_sign. */
  signature: string;
  /** Expected TEE signer registered on-chain for this provider. */
  signer: string;
  /** Address recovered locally from signedText + signature. */
  recovered: string;
  /** True iff recovered === signer. */
  valid: boolean;
}

export interface TakeResult {
  text: string;
  attestation: Attestation | null;
}

/**
 * Run one inference request against a TEE chatbot provider, fetch the provider's
 * ECDSA attestation for that exact response, and verify it locally so the full
 * signature can be persisted and independently re-checked.
 *
 * Key detail (0G SDK docstring): the per-response signature is cached under the
 * bare UUID in the `ZG-Res-Key` response header — NOT `completion.id` (which is
 * `chatcmpl-<uuid>`). Using completion.id 404s the signature fetch with the
 * misleading "getting signature error". `getRequestHeaders` is single-use.
 */
export async function generateTake(
  broker: Broker,
  provider: string,
  model: string,
  prompt: string,
  temperature?: number,
): Promise<TakeResult> {
  const { endpoint } = await broker.inference.getServiceMetadata(provider);
  const headers = await broker.inference.getRequestHeaders(provider, prompt);

  const requestHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") requestHeaders[key] = value;
  }

  const openai = new OpenAI({ baseURL: endpoint, apiKey: "" });
  // .withResponse() exposes the raw Response so we can read ZG-Res-Key.
  const { data: completion, response } = await openai.chat.completions
    .create(
      {
        model,
        messages: [{ role: "user", content: prompt }],
        ...(temperature !== undefined ? { temperature } : {}),
      },
      { headers: requestHeaders },
    )
    .withResponse();

  const text = completion.choices[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("0G Compute: provider returned empty completion");
  }

  const chatId = response.headers.get("ZG-Res-Key") ?? completion.id;

  let attestation: Attestation | null = null;
  try {
    const svcUrl = endpoint.replace(/\/v1\/proxy\/?$/, "");
    const sig = await InferenceVerifier.fetchSignatureByChatID(svcUrl, chatId, model);
    const { teeSignerAddress } = await broker.inference.checkProviderSignerStatus(provider);
    const recovered = ethers.verifyMessage(sig.text, sig.signature);
    attestation = {
      chatId,
      signedText: sig.text,
      signature: sig.signature,
      signer: teeSignerAddress,
      recovered,
      valid: recovered.toLowerCase() === teeSignerAddress.toLowerCase(),
    };
  } catch (err) {
    // Surface loudly — never silently store a broken attestation and proceed.
    console.warn(
      `0G Compute: attestation fetch/verify failed for provider ${provider}:`,
      err instanceof Error ? err.message : err,
    );
  }

  // Settle the micropayment. The 3rd arg must be the usage JSON, not the prose.
  try {
    await broker.inference.processResponse(
      provider,
      chatId,
      JSON.stringify(completion.usage ?? {}),
    );
  } catch (err) {
    console.warn(
      "0G Compute: fee settlement skipped:",
      err instanceof Error ? err.message : err,
    );
  }

  return { text: text.trim(), attestation };
}
