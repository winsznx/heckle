import "dotenv/config";
import { ethers } from "ethers";
import {
  ZERO_CUP_R32,
  ZERO_CUP_R32_EVENT_ID,
  storageUri,
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
  valid: boolean;
  root: string;
}

async function main(): Promise<void> {
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, provider);
  const characters = new ethers.Contract(
    env.HECKLE_CHARACTERS,
    HECKLE_CHARACTERS_ABI,
    provider,
  );

  const logs = await takes.queryFilter(
    takes.filters.TakeCommitted(null, null, EVENT_ID),
    36996000,
    "latest",
  );

  const rows: Row[] = [];
  for (const lg of logs) {
    const args = (lg as ethers.EventLog).args;
    const root = String(args.takeRoot);
    try {
      const blob = (await downloadJson(root)) as {
        matchupId?: string;
        prediction?: string;
        inferenceAttestation?: { valid?: boolean };
      };
      rows.push({
        takeId: BigInt(args.takeId),
        characterId: String(args.characterId),
        matchupId: typeof blob?.matchupId === "string" ? blob.matchupId : "",
        prediction: typeof blob?.prediction === "string" ? blob.prediction : null,
        valid: blob?.inferenceAttestation?.valid === true,
        root,
      });
    } catch {
      /* unreadable blob — skip */
    }
  }

  // Dedupe to latest take per (character, matchup) — mirrors the UI.
  const latest = new Map<string, Row>();
  for (const r of rows) {
    const key = `${r.characterId}:${r.matchupId}`;
    const prev = latest.get(key);
    if (!prev || r.takeId > prev.takeId) latest.set(key, r);
  }
  const deduped = [...latest.values()];

  const charIds = [...new Set(deduped.map((r) => r.characterId))].sort();
  const nameOf = new Map<string, string>();
  for (const cid of charIds) {
    try {
      const meta = await characters.characterOf(BigInt(cid));
      const pblob = (await downloadJson(String(meta[2]))) as { name?: string };
      nameOf.set(cid, pblob?.name ?? `#${cid}`);
    } catch {
      nameOf.set(cid, `#${cid}`);
    }
  }

  console.log(`\n=== Zero Cup R32 (event ${EVENT_ID}) — on-chain takes ===`);
  console.log(`raw take logs: ${rows.length}  |  deduped (latest/char/matchup): ${deduped.length}\n`);

  let totalValid = 0;
  for (const cid of charIds) {
    const mine = deduped.filter((r) => r.characterId === cid);
    const valid = mine.filter((r) => r.valid);
    totalValid += valid.length;
    const matchups = ZERO_CUP_R32.matchups.length;
    const sample = valid[0] ?? mine[0];
    console.log(`#${cid} ${nameOf.get(cid)}`);
    console.log(`  predictions: ${mine.length}/${matchups}  |  valid:true ${valid.length}/${mine.length}`);
    if (sample) {
      console.log(`  sample: "${sample.prediction}" (${sample.matchupId})`);
      console.log(`  blob:   ${storageUri(sample.root)}`);
      console.log(`  /storage/${sample.root}`);
    }
    console.log("");
  }

  console.log(`TOTAL valid:true predictions (deduped): ${totalValid}`);

  const wallet = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  const bal = await provider.getBalance(wallet.address);
  console.log(`\nagent wallet ${wallet.address}: ${ethers.formatEther(bal)} 0G remaining`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
