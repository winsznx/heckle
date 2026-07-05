import "dotenv/config";
import { ethers } from "ethers";
import { WORLD_CUP_FIXTURES, archetype, storageUri } from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_EVENTS_ABI, HECKLE_TAKES_ABI } from "./abis.js";
import { uploadJson } from "./zg-storage.js";
import {
  ensureLedger,
  generateTake,
  getBroker,
  pickProvider,
  prepareProvider,
} from "./zg-compute.js";

const KIND_PREDICTION = 1;
const PUNDIT_ID = 0n;

function log(...a: unknown[]): void {
  console.log("[wc]", ...a);
}

function buildPrompt(seed: string, a: string, b: string): string {
  return [
    seed,
    `Predict the outcome of this 2026 World Cup match: ${a} vs ${b}.`,
    `Output ONE line only: "<winner> over <loser>, <N>% confidence, <one-sentence football reason>".`,
    `<winner> MUST be exactly "${a}" or "${b}". English only. Reason from football signals (form, squad depth, tactics) — no ad-hominem.`,
  ].join("\n");
}

function parseWinner(text: string, a: string, b: string): string | null {
  const t = text.toLowerCase();
  const ia = t.indexOf(a.toLowerCase());
  const ib = t.indexOf(b.toLowerCase());
  if (ia === -1 && ib === -1) return null;
  if (ia === -1) return b;
  if (ib === -1) return a;
  return ia <= ib ? a : b;
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (register event + 4 takes). Re-run with --confirm.\n");
    process.exit(1);
  }
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  const events = new ethers.Contract(env.HECKLE_EVENTS, HECKLE_EVENTS_ABI, signer);
  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, signer);
  log("wallet:", signer.address);

  // 1. Register the World Cup event.
  const { root: eventRoot } = await uploadJson(signer, {
    title: "World Cup 2026",
    description: "Real football, same Heckle engine. The Pundit calls the knockouts.",
    category: "football",
    fixtures: WORLD_CUP_FIXTURES,
    resolutionSource: "FIFA World Cup 2026 official results",
    createdAt: Math.floor(Date.now() / 1000),
  });
  const now = Math.floor(Date.now() / 1000);
  const rc = await (await events.registerEvent(eventRoot, now, now + 14 * 86400)).wait();
  const reg = rc?.logs
    ?.map((l: ethers.Log) => {
      try {
        return events.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((p: ethers.LogDescription | null) => p?.name === "EventRegistered");
  const eventId = reg?.args?.eventId as bigint;
  log(`registered World Cup event = #${eventId}, root ${eventRoot}`);

  // 2. Attach The Pundit (idempotent).
  const attached: bigint[] = await events.attachmentsOf(eventId);
  if (!attached.map((x) => x.toString()).includes(PUNDIT_ID.toString())) {
    await (await events.attachCharacter(eventId, PUNDIT_ID)).wait();
    log("attached The Pundit");
  }

  // 3. Broker + generate a Pundit take per fixture.
  const broker = await getBroker(signer);
  await ensureLedger(broker);
  const choice = await pickProvider(broker);
  await prepareProvider(broker, choice.provider);
  const seed = archetype("analyst").systemSeed;

  for (const m of WORLD_CUP_FIXTURES) {
    const [a, b] = m.participants;
    try {
      const t = await generateTake(broker, choice.provider, choice.model, buildPrompt(seed, a.name, b.name), 0.2);
      const winner = parseWinner(t.text, a.name, b.name) ?? a.name;
      const { root } = await uploadJson(signer, {
        text: t.text,
        kind: "Prediction",
        matchupId: m.id,
        prediction: winner,
        characterId: "0",
        triggeringEvent: { label: `${a.name} vs ${b.name}`, timestamp: 0 },
        inferenceAttestation: t.attestation,
      });
      await (await takes.commitTake(PUNDIT_ID, eventId, root, KIND_PREDICTION)).wait();
      log(`${m.id} ${a.name} vs ${b.name}: ${winner} | ${t.text.replace(/\s+/g, " ")} | valid=${t.attestation?.valid ?? false}`);
    } catch (err) {
      log(`ERROR ${m.id}:`, err instanceof Error ? err.message : err);
    }
  }

  log(`DONE — set WORLD_CUP_EVENT_ID = ${eventId} in packages/shared/src/world-cup.ts`);
  log(`storage uri: ${storageUri(eventRoot)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
