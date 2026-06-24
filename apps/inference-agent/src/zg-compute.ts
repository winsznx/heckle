import {
  createZGComputeNetworkBroker,
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
  try {
    await broker.ledger.getLedger();
  } catch {
    await broker.ledger.addLedger(3);
  }
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
    if (!isAlreadyError(err, "already", "insufficient balance to refund")) throw err;
  }
}

export interface TakeResult {
  text: string;
  chatId: string;
  valid: boolean;
}

/**
 * Run one inference request against a TEE chatbot provider and verify the
 * attestation. `getRequestHeaders` is single-use per request.
 */
export async function generateTake(
  broker: Broker,
  provider: string,
  model: string,
  prompt: string,
): Promise<TakeResult> {
  const { endpoint } = await broker.inference.getServiceMetadata(provider);
  const headers = await broker.inference.getRequestHeaders(provider, prompt);

  const requestHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") requestHeaders[key] = value;
  }

  const openai = new OpenAI({ baseURL: endpoint, apiKey: "" });
  const completion = await openai.chat.completions.create(
    {
      model,
      messages: [{ role: "user", content: prompt }],
    },
    { headers: requestHeaders },
  );

  const text = completion.choices[0]?.message?.content ?? "";
  if (!text) {
    throw new Error("0G Compute: provider returned empty completion");
  }

  const chatId = completion.id;
  const valid = (await broker.inference.processResponse(provider, chatId, text)) ?? false;

  return { text: text.trim(), chatId, valid };
}
