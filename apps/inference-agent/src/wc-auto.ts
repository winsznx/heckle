import "dotenv/config";
import { ethers } from "ethers";
import {
  fetchWcFixturesMeta,
  WC_OUTCOME_ENUM,
  WC_KNOCKOUT_STAGES,
  WORLD_CUP_EVENT_ID,
  DEPLOYED_ADDRESSES,
  type WcFixture,
} from "@heckle/shared";
import { requireEnv, env } from "./env.js";
import { HECKLE_RESOLVER_ABI, HECKLE_TAKES_ABI } from "./abis.js";
import { downloadJson } from "./zg-storage.js";

/**
 * Autonomous resolver for live events. Cron this (e.g. Railway cron every few
 * hours). Each run:
 *   1. Rate-limited poll of the live feed for finished knockout results.
 *   2. Settles any not-yet-finalized result into HeckleResolver (write-once, so
 *      re-runs are free) — the on-chain source of truth.
 *   3. Grades every character's prediction on the matches THIS run just finalized,
 *      once, updating on-chain reputation. Because grading is scoped to the run
 *      that first finalizes a match, non-overlapping runs never double-count.
 *
 * Guarded by --confirm / WC_AUTO_CONFIRM=true so it never spends 0G by accident.
 * Schedule interval MUST exceed a run's duration so two runs never overlap.
 */

function log(...a: unknown[]): void {
  console.log("[wc-auto]", ...a);
}

function winnerName(f: WcFixture): string | null {
  if (f.score.outcome === "HOME") return f.home.name;
  if (f.score.outcome === "AWAY") return f.away.name;
  if (f.score.outcome === "DRAW") return "Draw";
  return null;
}

interface Take {
  takeId: bigint;
  characterId: string;
  matchId: string;
  prediction: string | null;
}

async function main(): Promise<void> {
  const confirmed =
    process.argv.includes("--confirm") || process.env.WC_AUTO_CONFIRM === "true";
  if (!confirmed) {
    console.error(
      "\nAutonomous resolver — SPENDS 0G (settle + grade). Run with --confirm or set WC_AUTO_CONFIRM=true.\n",
    );
    process.exit(1);
  }
  if (WORLD_CUP_EVENT_ID === null) throw new Error("WORLD_CUP_EVENT_ID is null.");
  const token = env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("Set FOOTBALL_DATA_TOKEN for the live feed.");

  const cfg = requireEnv();
  const resolverAddr = env.HECKLE_RESOLVER || DEPLOYED_ADDRESSES.resolver;
  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  const signer = new ethers.Wallet(cfg.AGENT_PRIVATE_KEY, provider);
  const resolver = new ethers.Contract(resolverAddr, HECKLE_RESOLVER_ABI, signer);
  const takes = new ethers.Contract(cfg.HECKLE_TAKES, HECKLE_TAKES_ABI, signer);
  const eventId = BigInt(WORLD_CUP_EVENT_ID);
  log("wallet:", signer.address, "| resolver:", resolverAddr, "| event:", eventId.toString());

  // 1. Live feed (rate-limit aware).
  const { fixtures, requestsRemaining } = await fetchWcFixturesMeta(token);
  log(`feed: ${fixtures.length} matches | rate headroom this minute: ${requestsRemaining ?? "n/a"}`);
  if (requestsRemaining !== null && requestsRemaining <= 1) {
    log("rate limit nearly exhausted — backing off this run.");
    return;
  }

  const finished = fixtures.filter(
    (f) =>
      f.finished &&
      f.score.outcome !== null &&
      (WC_KNOCKOUT_STAGES as readonly string[]).includes(f.stage),
  );
  if (finished.length === 0) {
    log("no finished knockout results yet — nothing to do.");
    return;
  }

  // 2. Which finished matches are not yet finalized on-chain → settle those.
  const toSettle: WcFixture[] = [];
  for (const f of finished) {
    const alreadyFinal: boolean = await resolver.isFinalized(f.matchId);
    if (!alreadyFinal) toSettle.push(f);
  }
  if (toSettle.length === 0) {
    log("all finished results already settled on-chain — nothing new.");
    return;
  }
  log(`settling ${toSettle.length} newly-finished result(s) on-chain`);

  const tx = await resolver.resolveBatch(
    toSettle.map((f) => f.matchId),
    toSettle.map((f) => WC_OUTCOME_ENUM[f.score.outcome!]),
    toSettle.map((f) => f.score.home ?? 0),
    toSettle.map((f) => f.score.away ?? 0),
    toSettle.map(() => true),
  );
  await tx.wait();
  for (const f of toSettle) {
    log(`  settled ${f.matchId}: ${f.home.name} ${f.score.home}-${f.score.away} ${f.away.name} → ${f.score.outcome}`);
  }

  // 3. Grade character predictions for the matches just finalized (once).
  const settledIds = new Set(toSettle.map((f) => String(f.matchId)));
  const fixtureById = new Map(toSettle.map((f) => [String(f.matchId), f]));

  const logs = await takes.queryFilter(
    takes.filters.TakeCommitted(null, null, eventId),
    36996000,
    "latest",
  );
  const rows: Take[] = [];
  for (const lg of logs) {
    const args = (lg as ethers.EventLog).args;
    try {
      const blob = (await downloadJson(String(args.takeRoot))) as {
        matchupId?: string;
        prediction?: string;
      };
      if (blob?.matchupId && settledIds.has(blob.matchupId)) {
        rows.push({
          takeId: BigInt(args.takeId),
          characterId: String(args.characterId),
          matchId: blob.matchupId,
          prediction: typeof blob.prediction === "string" ? blob.prediction : null,
        });
      }
    } catch {
      /* skip unreadable blob */
    }
  }

  // Latest take per (character, match).
  const latest = new Map<string, Take>();
  for (const r of rows) {
    const key = `${r.characterId}:${r.matchId}`;
    const prev = latest.get(key);
    if (!prev || r.takeId > prev.takeId) latest.set(key, r);
  }

  let graded = 0;
  for (const t of latest.values()) {
    const f = fixtureById.get(t.matchId);
    if (!f) continue;
    const w = winnerName(f);
    const correct = Boolean(w && t.prediction && t.prediction.trim().toLowerCase() === w.toLowerCase());
    try {
      await (await takes.gradePrediction(BigInt(t.characterId), correct)).wait();
      graded++;
      log(`  graded #${t.characterId} ${t.matchId}: called ${t.prediction} → ${correct ? "correct ✓" : "wrong"}`);
    } catch (err) {
      log(`  grade ERROR #${t.characterId} ${t.matchId}:`, err instanceof Error ? err.message : err);
    }
  }

  log(`DONE — settled ${toSettle.length}, graded ${graded} prediction(s). tx ${tx.hash}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
