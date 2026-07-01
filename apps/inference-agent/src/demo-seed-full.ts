import { ethers } from "ethers";
import {
  ARCHETYPE_IDS,
  DEMO_EVENT,
  archetype,
  storageUri,
  type TakeKind,
} from "@heckle/shared";
import { requireEnv } from "./env.js";
import {
  HECKLE_CHARACTERS_ABI,
  HECKLE_EVENTS_ABI,
  HECKLE_TAKES_ABI,
} from "./abis.js";
import { uploadJson } from "./zg-storage.js";
import {
  ensureLedger,
  generateTake,
  getBroker,
  pickProvider,
  prepareProvider,
} from "./zg-compute.js";
import { buildTakePrompt } from "./prompt.js";

/**
 * One-shot demo seeder for the group-stage submission. Idempotent: registers
 * the demo event, mints the demo character, attaches it, walks the event
 * generating real 0G-Compute (TEE) takes committed on-chain, grades the
 * prediction, then EXITS. Reuses the existing 0G Compute ledger if funded.
 *
 * Run: pnpm --filter @heckle/inference-agent exec tsx src/demo-seed-full.ts --confirm
 */

const KIND_TO_ENUM: Record<TakeKind, number> = { Reaction: 0, Prediction: 1, Debate: 2 };
const STATUS_LIVE = 1;
const EVENT_ID = BigInt(DEMO_EVENT.id);

const DEMO_CHARACTER = {
  archetypeId: "analyst" as const,
  name: "The Pundit",
  handle: "the-pundit",
  personalityBrief:
    "Veteran football analyst. Calm, tactical, reads the game three passes ahead. Numbers over narratives, never loses composure.",
};

function log(...args: unknown[]): void {
  console.log("[demo-seed]", ...args);
}

function extractPrediction(text: string): string | undefined {
  const match = text.match(/prediction:\s*(.+)$/im);
  return match ? match[1].trim() : undefined;
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error(
      "\nThis SPENDS 0G (storage fees + on-chain txs + Compute inference).\n" +
        "Re-run with --confirm.\n",
    );
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  log("agent/owner wallet:", signer.address);

  const events = new ethers.Contract(env.HECKLE_EVENTS, HECKLE_EVENTS_ABI, signer);
  const characters = new ethers.Contract(env.HECKLE_CHARACTERS, HECKLE_CHARACTERS_ABI, signer);
  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, signer);

  // 1. Register the demo event (idempotent: skip if event 1 already has a curator).
  const existingEvent = await events.eventOf(EVENT_ID).catch(() => null);
  if (!existingEvent || existingEvent[4] === ethers.ZeroAddress) {
    log("uploading DEMO_EVENT metadata to 0G Storage ...");
    const { root: eventRoot, uri } = await uploadJson(signer, DEMO_EVENT);
    log("event root", eventRoot, uri);
    const startsAt = Math.floor(Date.now() / 1000);
    const endsAt = startsAt + DEMO_EVENT.durationSeconds;
    log("registerEvent ...");
    await (await events.registerEvent(eventRoot, startsAt, endsAt)).wait();
    log("setStatus Live ...");
    await (await events.setStatus(EVENT_ID, STATUS_LIVE)).wait();
  } else {
    log("event", EVENT_ID.toString(), "already registered, skipping.");
  }

  // 2. Mint the demo character (idempotent: skip if anything minted; demo is tokenId 0).
  let demoTokenId = 0n;
  const totalMinted: bigint = await characters.totalMinted();
  if (totalMinted === 0n) {
    log("uploading personality blob ...");
    const def = archetype(DEMO_CHARACTER.archetypeId);
    const { root: personalityRoot } = await uploadJson(signer, {
      name: DEMO_CHARACTER.name,
      handle: DEMO_CHARACTER.handle,
      archetype: DEMO_CHARACTER.archetypeId,
      personalityBrief: DEMO_CHARACTER.personalityBrief,
      systemSeed: def.systemSeed,
      createdAt: Math.floor(Date.now() / 1000),
      creator: signer.address,
    });
    const archetypeIndex = ARCHETYPE_IDS.indexOf(DEMO_CHARACTER.archetypeId);
    log(`minting "${DEMO_CHARACTER.name}" (archetype ${archetypeIndex}) ...`);
    await (
      await characters.mint(
        storageUri(personalityRoot),
        archetypeIndex,
        DEMO_CHARACTER.handle,
        personalityRoot,
      )
    ).wait();
    log("minted demo character tokenId", demoTokenId.toString());
  } else {
    log("character already minted; using tokenId 0 as the demo character.");
  }

  // 3. Attach the demo character to the event (idempotent).
  const attached: bigint[] = await events.attachmentsOf(EVENT_ID);
  if (!attached.some((id) => BigInt(id) === demoTokenId)) {
    log(`attaching character #${demoTokenId} to event #${EVENT_ID} ...`);
    await (await events.attachCharacter(EVENT_ID, demoTokenId)).wait();
  } else {
    log("character already attached, skipping.");
  }

  // 4. Skip take generation if already seeded.
  const rep = await takes.reputationOf(demoTokenId);
  if (!force && BigInt(rep[0]) >= BigInt(DEMO_EVENT.triggers.length)) {
    log(
      `character already has ${rep[0]} takes — already seeded. Use --force to regenerate. Done.`,
    );
    return;
  }

  // 5. 0G Compute: reuse existing ledger, pick provider, prepare sub-account.
  log("initializing 0G Compute broker (reuses existing ledger if funded) ...");
  const broker = await getBroker(signer);
  await ensureLedger(broker);
  const choice = await pickProvider(broker);
  await prepareProvider(broker, choice.provider);
  log(`provider ${choice.provider} model ${choice.model}`);

  const def = archetype(DEMO_CHARACTER.archetypeId);

  // 6. Walk the event generating + committing one take per beat.
  for (const trigger of DEMO_EVENT.triggers) {
    log(`beat "${trigger.label}" (${trigger.kind}) ...`);
    const prompt = buildTakePrompt({
      archetypeSeed: def.systemSeed,
      personalityBrief: DEMO_CHARACTER.personalityBrief,
      eventContext: `${DEMO_EVENT.title} — ${DEMO_EVENT.description}`,
      triggerLabel: trigger.label,
      triggerContext: trigger.context,
      kind: trigger.kind,
    });
    const take = await generateTake(broker, choice.provider, choice.model, prompt);
    log(`  take: ${take.text.replace(/\s+/g, " ")}`);
    log(
      `  attestation valid=${take.attestation?.valid ?? false} signer=${take.attestation?.signer ?? "?"}`,
    );

    const prediction = trigger.kind === "Prediction" ? extractPrediction(take.text) : undefined;
    const blob = {
      text: take.text,
      kind: trigger.kind,
      characterId: demoTokenId.toString(),
      triggeringEvent: { label: trigger.label, timestamp: trigger.atSeconds },
      ...(prediction ? { prediction } : {}),
      inferenceAttestation: take.attestation,
    };
    const { root, uri } = await uploadJson(signer, blob);
    log(`  stored take → ${uri}`);
    const commitTx = await takes.commitTake(
      demoTokenId,
      EVENT_ID,
      root,
      KIND_TO_ENUM[trigger.kind],
    );
    const committed = await commitTx.wait();
    log(`  committed: ${committed?.hash ?? commitTx.hash}`);
  }

  // 7. Grade the winner prediction (ground truth = North End FC).
  const winner = DEMO_EVENT.predictionFields.find((f) => f.field === "winner")?.resolvedValue;
  const correct = winner === "North End FC";
  log(`grading winner prediction: truth ${winner}, correct=${correct}`);
  await (await takes.gradePrediction(demoTokenId, correct)).wait();

  log("Demo seed complete. View /characters/0 and /events/1.");
}

main().catch((err) => {
  console.error("[demo-seed] Fatal:", err);
  process.exit(1);
});
