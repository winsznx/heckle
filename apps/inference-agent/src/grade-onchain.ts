import "dotenv/config";
import { ethers } from "ethers";
import {
  ZERO_CUP_R32_EVENT_ID,
  ZERO_CUP_R32_RESULTS,
  gradePrediction,
} from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_TAKES_ABI } from "./abis.js";
import { downloadJson } from "./zg-storage.js";

const EVENT_ID = BigInt(ZERO_CUP_R32_EVENT_ID ?? 2);

interface Row {
  takeId: bigint;
  characterId: string;
  matchupId: string;
  prediction: string | null;
}

function log(...a: unknown[]): void {
  console.log("[grade]", ...a);
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (up to 48 gradePrediction txs). Re-run with --confirm.\n");
    process.exit(1);
  }
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, signer);
  log("committer:", signer.address);

  const logs = await takes.queryFilter(
    takes.filters.TakeCommitted(null, null, EVENT_ID),
    36996000,
    "latest",
  );

  const rows: Row[] = [];
  for (const lg of logs) {
    const args = (lg as ethers.EventLog).args;
    try {
      const blob = (await downloadJson(String(args.takeRoot))) as {
        matchupId?: string;
        prediction?: string;
      };
      if (blob?.matchupId && ZERO_CUP_R32_RESULTS[blob.matchupId]) {
        rows.push({
          takeId: BigInt(args.takeId),
          characterId: String(args.characterId),
          matchupId: blob.matchupId,
          prediction: typeof blob.prediction === "string" ? blob.prediction : null,
        });
      }
    } catch {
      /* skip */
    }
  }

  // Latest take per (character, matchup) — grade the clean regen, not garbled.
  const latest = new Map<string, Row>();
  for (const r of rows) {
    const key = `${r.characterId}:${r.matchupId}`;
    const prev = latest.get(key);
    if (!prev || r.takeId > prev.takeId) latest.set(key, r);
  }
  const graded = [...latest.values()];
  const byChar = new Map<string, Row[]>();
  for (const r of graded) {
    const arr = byChar.get(r.characterId) ?? [];
    arr.push(r);
    byChar.set(r.characterId, arr);
  }

  let applied = 0;
  let skipped = 0;
  for (const [cid, preds] of byChar) {
    // Idempotency: gradePrediction increments predictionsTotal, so if the
    // on-chain total already covers these, skip re-grading (double-count guard).
    const rep = await takes.reputationOf(BigInt(cid));
    const already = Number(rep.predictionsTotal);
    if (already >= preds.length) {
      log(`#${cid}: already graded (${already} on-chain) — skip`);
      skipped += preds.length;
      continue;
    }
    for (const p of preds) {
      const correct = gradePrediction(p.matchupId, p.prediction) === "correct";
      try {
        await (await takes.gradePrediction(BigInt(cid), correct)).wait();
        applied++;
        log(`#${cid} ${p.matchupId}: ${correct ? "correct ✓" : "wrong"} (${applied})`);
      } catch (err) {
        log(`#${cid} ${p.matchupId} ERROR:`, err instanceof Error ? err.message : err);
      }
    }
    const after = await takes.reputationOf(BigInt(cid));
    log(`#${cid} on-chain now: ${after.predictionsCorrect}/${after.predictionsTotal} correct, weightedScore ${after.weightedScore}`);
  }

  log(`DONE — applied=${applied} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
