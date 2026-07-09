import "dotenv/config";
import { ethers } from "ethers";
import {
  ZERO_CUP_QF_MATCHUPS,
  ZERO_CUP_R32_EVENT_ID,
  archetype,
  type ArchetypeId,
  type ZeroCupMatchup,
} from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_VERIFIED_TAKES_ABI } from "./abis.js";
import { uploadJson } from "./zg-storage.js";
import { commitVerifiedTake, matchupToBytes32 } from "./commit-verified-take.js";
import {
  ensureLedger,
  generateTake,
  getBroker,
  pickProvider,
  prepareProvider,
} from "./zg-compute.js";

/**
 * Zero Cup Quarter-final predictions from all six hecklers. Every character
 * already exists — the original three on HeckleCharacters (0/3/4) and the three
 * ERC-7857 hecklers on HeckleINFT (5/6/7) — so this only generates and commits
 * TEE-attested takes; it mints nothing. Idempotent by (character, matchup).
 *
 *   (no flag)  dry note, then exits
 *   --confirm  generate + commit up to 24 QF takes (6 hecklers x 4 matchups)
 */
const KIND_PREDICTION = 1;
const EVENT_ID = BigInt(ZERO_CUP_R32_EVENT_ID ?? 2);
// Low temperature keeps the strict one-line format stable across models.
const TEMPERATURE = 0.2;
const VERIFIABILITY = "TeeML";

interface Heckler {
  id: bigint;
  name: string;
  arch: ArchetypeId;
  brief: string;
}

const ROSTER: Heckler[] = [
  { id: 0n, name: "The Pundit", arch: "analyst", brief: "Veteran analyst. Calm, tactical, reads three moves ahead. Numbers over narratives." },
  { id: 3n, name: "The Hater", arch: "hater", brief: "Bitter ex-player turned analyst. Sees every weakness, never sugarcoats, predicts what teams get wrong." },
  { id: 4n, name: "The Optimist", arch: "optimist", brief: "Believes every team is talented; finds the one strength even in weak showings, always backed by a specific observation." },
  { id: 5n, name: "The Homer", arch: "homer", brief: "Ride-or-die superfan. Every call breaks their team's way — loyalty over logic, backed by an encyclopedic memory." },
  { id: 6n, name: "The Firebrand", arch: "drama", brief: "Pure drama. Every moment is the most important in history — operatic, breathless, maximum stakes." },
  { id: 7n, name: "The Contrarian", arch: "contrarian", brief: "Takes the unpopular read on purpose, straight-faced. If everyone agrees, they disagree." },
];

function log(...args: unknown[]): void {
  console.log("[qf]", ...args);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Reject if a promise (e.g. a hung 0G inference request) doesn't settle in time. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

/** Retry a flaky network step (0G RPC throws transient TLS "bad record mac"). */
async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      log(`  ${label} attempt ${i}/${tries}: ${err instanceof Error ? err.message.slice(0, 80) : err}`);
      await sleep(3000 * i);
    }
  }
  throw last;
}

function buildPrompt(seed: string, brief: string, m: ZeroCupMatchup): string {
  return [
    seed,
    `Your personality brief: ${brief}`,
    "",
    `Predict the outcome of this Zero Cup hackathon Quarter-final matchup: ${m.a.name} vs ${m.b.name}.`,
    "",
    "OUTPUT RULES (obey exactly):",
    `- Output ONE line only, exactly: "<winner> over <loser>, <N>% confidence, <one-sentence technical reason>".`,
    `- <winner> MUST be exactly "${m.a.name}" or "${m.b.name}"; <loser> is the other.`,
    "- The reason must rest ONLY on technical signals: stack depth, product clarity, demo quality, slice originality.",
    "- NEVER make ad-hominem claims about teams, builders, or their judgment. No editorial commentary beyond the matchup outcome.",
    "- Stay in your character's voice, but obey every rule above.",
  ].join("\n");
}

function parseWinner(text: string, m: ZeroCupMatchup): string | null {
  const t = text.toLowerCase();
  const a = m.a.name.toLowerCase();
  const b = m.b.name.toLowerCase();
  const overIdx = t.indexOf(" over ");
  const head = overIdx >= 0 ? t.slice(0, overIdx) : t;
  if (head.includes(a) && !head.includes(b)) return m.a.name;
  if (head.includes(b) && !head.includes(a)) return m.b.name;
  const ai = t.indexOf(a);
  const bi = t.indexOf(b);
  if (ai === -1 && bi === -1) return null;
  if (ai === -1) return m.b.name;
  if (bi === -1) return m.a.name;
  return ai <= bi ? m.a.name : m.b.name;
}

const BANNED = ["idiot", "stupid", "scam", "fraud", "clown", "incompetent", "ripoff", "garbage team"];
function crossesGuardrail(text: string): boolean {
  const t = text.toLowerCase();
  return BANNED.some((w) => t.includes(w));
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (up to 24 QF prediction takes). Re-run with --confirm.\n");
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const matchups = ZERO_CUP_QF_MATCHUPS;
  log(`round: qf (${matchups.length} matchups, ${ROSTER.length} hecklers)`);

  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  log("wallet:", signer.address);

  const verified = new ethers.Contract(env.HECKLE_VERIFIED_TAKES, HECKLE_VERIFIED_TAKES_ABI, signer);

  // Existing (char, matchup) predictions to skip — read from the contract-verified
  // source of truth. The event carries matchupId directly (bytes32).
  const done = new Set<string>();
  const verifiedLogs = await verified.queryFilter(
    verified.filters.VerifiedTakeCommitted(null, null, EVENT_ID),
    36996000,
    "latest",
  );
  for (const lg of verifiedLogs) {
    const args = (lg as ethers.EventLog).args;
    done.add(`${(args.characterId as bigint).toString()}:${String(args.matchupId)}`);
  }
  log(`already committed for event ${EVENT_ID}: ${done.size} (char:matchup) pairs`);

  log("init 0G Compute broker ...");
  const broker = await withRetry("getBroker", () => getBroker(signer));
  await withRetry("ensureLedger", () => ensureLedger(broker));
  const choice = await withRetry("pickProvider", () => pickProvider(broker));
  await withRetry("prepareProvider", () => prepareProvider(broker, choice.provider));
  log("provider", choice.provider, choice.model);

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  for (const c of ROSTER) {
    const seed = archetype(c.arch).systemSeed;
    for (const m of matchups) {
      if (!force && done.has(`${c.id}:${matchupToBytes32(m.id)}`)) {
        skipped++;
        continue;
      }
      try {
        const prompt = buildPrompt(seed, c.brief, m);
        let chosen: Awaited<ReturnType<typeof generateTake>> | null = null;
        let winner: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          let t: Awaited<ReturnType<typeof generateTake>>;
          try {
            t = await withTimeout(
              generateTake(broker, choice.provider, choice.model, prompt, TEMPERATURE),
              75000,
              `generateTake ${m.id} #${c.id}`,
            );
          } catch (err) {
            log(`  retry ${attempt + 1} (#${c.id} ${m.id}) — ${err instanceof Error ? err.message.slice(0, 60) : err}`);
            continue;
          }
          const w = parseWinner(t.text, m);
          if (w && !crossesGuardrail(t.text)) {
            chosen = t;
            winner = w;
            break;
          }
          log(`  retry ${attempt + 1} (#${c.id} ${m.id}) — ${!w ? "no winner" : "guardrail"}`);
        }
        if (!chosen || !winner) {
          failed++;
          log(`  SKIPPED ${m.id} for #${c.id} after retries`);
          continue;
        }
        log(`#${c.id} ${c.name} · ${m.id}: ${winner} | ${chosen.text.replace(/\s+/g, " ")} | valid=${chosen.attestation?.valid ?? false}`);
        const { root } = await uploadJson(signer, {
          text: chosen.text,
          kind: "Prediction",
          matchupId: m.id,
          prediction: winner,
          characterId: c.id.toString(),
          // Full inference provenance. The model + params are bound into the
          // TEE-signed request hash; recording them in plain text lets a reader
          // see exactly how (and on which node) the heckler reasoned.
          inference: {
            provider: choice.provider,
            model: choice.model,
            temperature: TEMPERATURE,
            verifiability: VERIFIABILITY,
            usage: chosen.usage,
          },
          triggeringEvent: { label: `${m.label}: ${m.a.name} vs ${m.b.name}`, timestamp: 0 },
          inferenceAttestation: chosen.attestation,
        });
        const res = await commitVerifiedTake(signer, {
          characterId: c.id,
          eventId: EVENT_ID,
          matchupId: m.id,
          takeRoot: root,
          kind: KIND_PREDICTION,
          attestation: chosen.attestation,
        });
        if (res.status === "committed") {
          generated++;
        } else if (res.status === "already") {
          skipped++;
        } else {
          failed++;
          log(`  SKIPPED (unverified attestation) ${m.id} #${c.id}`);
        }
      } catch (err) {
        failed++;
        log(`  ERROR ${m.id} #${c.id}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  log(`DONE — generated=${generated} skipped(existing)=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
