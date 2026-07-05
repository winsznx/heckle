import "dotenv/config";
import { ethers } from "ethers";
import {
  fetchWcFixtures,
  WC_OUTCOME_ENUM,
  WC_KNOCKOUT_STAGES,
  DEPLOYED_ADDRESSES,
} from "@heckle/shared";
import { requireEnv, env } from "./env.js";
import { HECKLE_RESOLVER_ABI } from "./abis.js";

function log(...a: unknown[]): void {
  console.log("[wc-resolve]", ...a);
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (writes finished results on-chain). Re-run with --confirm.\n");
    process.exit(1);
  }
  const token = env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("Set FOOTBALL_DATA_TOKEN for the live result feed.");

  const cfg = requireEnv();
  const resolverAddr = env.HECKLE_RESOLVER || DEPLOYED_ADDRESSES.resolver;
  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  const signer = new ethers.Wallet(cfg.AGENT_PRIVATE_KEY, provider);
  const resolver = new ethers.Contract(resolverAddr, HECKLE_RESOLVER_ABI, signer);
  log("wallet:", signer.address, "| resolver:", resolverAddr);

  const all = await fetchWcFixtures(token);
  const finished = all.filter(
    (f) =>
      f.finished &&
      f.score.outcome !== null &&
      (WC_KNOCKOUT_STAGES as readonly string[]).includes(f.stage),
  );
  log(`live feed: ${finished.length} finished knockout results`);
  if (finished.length === 0) {
    log("nothing to settle yet.");
    return;
  }

  // Skip any already finalized on-chain — the contract also guards this, but
  // filtering first keeps the batch tight and the log honest.
  const pending: typeof finished = [];
  for (const f of finished) {
    const [, , , , alreadyFinal] = await resolver.results(f.matchId);
    if (alreadyFinal) {
      log(`skip ${f.matchId} ${f.home.name} v ${f.away.name} — already final on-chain`);
    } else {
      pending.push(f);
    }
  }
  if (pending.length === 0) {
    log("all finished results already settled on-chain.");
    return;
  }

  const matchIds = pending.map((f) => f.matchId);
  const outcomes = pending.map((f) => WC_OUTCOME_ENUM[f.score.outcome!]);
  const homeScores = pending.map((f) => f.score.home ?? 0);
  const awayScores = pending.map((f) => f.score.away ?? 0);
  const finalized = pending.map(() => true);

  for (const f of pending) {
    log(`settle ${f.matchId}: ${f.home.name} ${f.score.home}-${f.score.away} ${f.away.name} → ${f.score.outcome}`);
  }

  const tx = await resolver.resolveBatch(matchIds, outcomes, homeScores, awayScores, finalized);
  const rc = await tx.wait();
  log(`DONE — settled ${pending.length} results on-chain. tx ${rc?.hash}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
