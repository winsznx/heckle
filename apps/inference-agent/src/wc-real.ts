import "dotenv/config";
import { ethers } from "ethers";
import {
  archetype,
  fetchWcFixtures,
  upcomingKnockouts,
  WORLD_CUP_EVENT_ID,
} from "@heckle/shared";
import { requireEnv, env } from "./env.js";
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
  console.log("[wc-real]", ...a);
}

function buildPrompt(seed: string, a: string, b: string): string {
  return [
    seed,
    `Predict the winner of this 2026 FIFA World Cup knockout match: ${a} vs ${b}.`,
    `Output ONE line only: "<winner> over <loser> — <one concise sentence of football reasoning>".`,
    `<winner> MUST be exactly "${a}" or "${b}". English only. Reason from football signals (form, squad depth, tactics, knockout experience). No hedging, no confidence percentage, no ad-hominem.`,
  ].join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseWinner(text: string, a: string, b: string): string {
  const t = text.toLowerCase();
  const ia = t.indexOf(a.toLowerCase());
  const ib = t.indexOf(b.toLowerCase());
  if (ia === -1 && ib === -1) return a;
  if (ia === -1) return b;
  if (ib === -1) return a;
  return ia <= ib ? a : b;
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error(
      "\nThis SPENDS 0G (one attested take + commit per upcoming knockout). Re-run with --confirm.\n",
    );
    process.exit(1);
  }
  if (WORLD_CUP_EVENT_ID === null) {
    throw new Error("WORLD_CUP_EVENT_ID is null — register the WC event first.");
  }
  const token = env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("Set FOOTBALL_DATA_TOKEN for the live fixture feed.");

  const cfg = requireEnv();
  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  const signer = new ethers.Wallet(cfg.AGENT_PRIVATE_KEY, provider);
  const events = new ethers.Contract(cfg.HECKLE_EVENTS, HECKLE_EVENTS_ABI, signer);
  const takes = new ethers.Contract(cfg.HECKLE_TAKES, HECKLE_TAKES_ABI, signer);
  const eventId = BigInt(WORLD_CUP_EVENT_ID);
  log("wallet:", signer.address, "| event:", eventId.toString());

  // 1. Real upcoming knockout fixtures from the live feed.
  const all = await fetchWcFixtures(token);
  const upcoming = upcomingKnockouts(all);
  log(`live feed: ${all.length} matches, ${upcoming.length} upcoming knockouts with known teams`);
  if (upcoming.length === 0) {
    log("nothing to call right now — no upcoming knockout with set teams.");
    return;
  }

  // 2. Attach The Pundit to the WC event (idempotent).
  const attached: bigint[] = await events.attachmentsOf(eventId);
  if (!attached.map((x) => x.toString()).includes(PUNDIT_ID.toString())) {
    await (await events.attachCharacter(eventId, PUNDIT_ID)).wait();
    log("attached The Pundit");
  }

  // 3. Broker + a Pundit take per upcoming fixture. Sequential commits keep the
  //    nonce clean (parallel sends previously raced into "replacement fee too low").
  const broker = await getBroker(signer);
  await ensureLedger(broker);
  const choice = await pickProvider(broker);
  await prepareProvider(broker, choice.provider);
  const seed = archetype("analyst").systemSeed;

  for (const f of upcoming) {
    const a = f.home.name;
    const b = f.away.name;
    // 0G Compute occasionally throws a transient TLS "bad record mac" — retry a
    // few times before giving up on a fixture rather than silently dropping it.
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const t = await generateTake(
          broker,
          choice.provider,
          choice.model,
          buildPrompt(seed, a, b),
          0.2,
        );
        const winner = parseWinner(t.text, a, b);
        const { root } = await uploadJson(signer, {
          text: t.text,
          kind: "Prediction",
          matchupId: String(f.matchId),
          prediction: winner,
          characterId: "0",
          triggeringEvent: {
            label: `${a} vs ${b}`,
            stage: f.stage,
            kickoff: f.utcDate,
            timestamp: 0,
          },
          inferenceAttestation: t.attestation,
        });
        await (await takes.commitTake(PUNDIT_ID, eventId, root, KIND_PREDICTION)).wait();
        done = true;
        log(
          `${f.matchId} ${a} vs ${b}: ${winner} | ${t.text.replace(/\s+/g, " ")} | valid=${t.attestation?.valid ?? false}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`attempt ${attempt}/3 failed ${f.matchId} ${a} vs ${b}: ${msg}`);
        if (attempt < 3) await sleep(2500);
      }
    }
    if (!done) log(`GAVE UP ${f.matchId} ${a} vs ${b} after 3 attempts`);
  }

  log(`DONE — World Cup event #${eventId}: The Pundit's live calls committed on-chain.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
