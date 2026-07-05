import "dotenv/config";
import { ethers } from "ethers";
import {
  ZERO_CUP_R32_EVENT_ID,
  ZERO_CUP_R32_RESULTS,
  REP_SCORING,
  gradePrediction,
} from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_CHARACTERS_ABI, HECKLE_TAKES_ABI } from "./abis.js";
import { downloadJson } from "./zg-storage.js";

const EVENT_ID = BigInt(ZERO_CUP_R32_EVENT_ID ?? 2);

interface Row {
  takeId: bigint;
  characterId: string;
  matchupId: string;
  prediction: string | null;
}

async function main(): Promise<void> {
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, provider);
  const characters = new ethers.Contract(env.HECKLE_CHARACTERS, HECKLE_CHARACTERS_ABI, provider);

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
      /* skip unreadable */
    }
  }

  // Latest take per (character, matchup).
  const latest = new Map<string, Row>();
  for (const r of rows) {
    const key = `${r.characterId}:${r.matchupId}`;
    const prev = latest.get(key);
    if (!prev || r.takeId > prev.takeId) latest.set(key, r);
  }
  const graded = [...latest.values()];

  const ids = [...new Set(graded.map((r) => r.characterId))].sort();
  const nameOf = new Map<string, string>();
  for (const cid of ids) {
    try {
      const meta = await characters.characterOf(BigInt(cid));
      const pblob = (await downloadJson(String(meta[2]))) as { name?: string };
      nameOf.set(cid, pblob?.name ?? `#${cid}`);
    } catch {
      nameOf.set(cid, `#${cid}`);
    }
  }

  console.log(`\n=== R32 grading (event ${EVENT_ID}) — ${graded.length} predictions ===\n`);

  const board = ids.map((cid) => {
    const mine = graded.filter((r) => r.characterId === cid);
    let correct = 0;
    let wrong = 0;
    const misses: string[] = [];
    const hits: string[] = [];
    for (const r of mine) {
      const outcome = gradePrediction(r.matchupId, r.prediction);
      if (outcome === "correct") {
        correct++;
        hits.push(`${r.matchupId}:${r.prediction}`);
      } else if (outcome === "wrong") {
        wrong++;
        misses.push(`${r.matchupId}:${r.prediction}→${ZERO_CUP_R32_RESULTS[r.matchupId]}`);
      }
    }
    const rep = correct * REP_SCORING.correct + wrong * REP_SCORING.wrong;
    const acc = mine.length ? Math.round((correct / mine.length) * 100) : 0;
    return { cid, name: nameOf.get(cid)!, total: mine.length, correct, wrong, acc, rep, misses };
  });

  board.sort((a, b) => b.correct - a.correct || b.rep - a.rep);

  for (const [i, c] of board.entries()) {
    console.log(`${i + 1}. #${c.cid} ${c.name}`);
    console.log(`   ${c.correct}/${c.total} correct (${c.acc}%)  |  rep ${c.rep >= 0 ? "+" : ""}${c.rep}`);
    console.log(`   missed: ${c.misses.join("  ") || "none"}`);
    console.log("");
  }

  const heckleWon = ZERO_CUP_R32_RESULTS["R32_15"] === "Heckle";
  console.log(`(sanity: R32_15 winner = ${ZERO_CUP_R32_RESULTS["R32_15"]} ${heckleWon ? "✅" : "❌"})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
