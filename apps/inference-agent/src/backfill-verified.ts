import "dotenv/config";
import { ethers } from "ethers";
import { requireEnv } from "./env.js";
import { HECKLE_TAKES_ABI } from "./abis.js";
import { downloadJson } from "./zg-storage.js";
import { commitVerifiedTake } from "./commit-verified-take.js";

/**
 * Retroactively contract-verify every existing legacy take. Reads all
 * TakeCommitted events from HeckleTakes, downloads each blob, and commits it to
 * HeckleVerifiedTakes — where the contract re-recovers the 0G TEE signer and
 * only records it if the signer is a registered attestor. Idempotent: takes
 * already verified (by root) are skipped; takes with no/invalid attestation are
 * skipped (they can't be verified, so they must not count).
 *
 * Run: pnpm --filter @heckle/inference-agent exec tsx src/backfill-verified.ts --confirm
 */
const FROM_BLOCK = 36996000n;

function log(...args: unknown[]): void {
  console.log("[backfill]", ...args);
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (one commit per unverified take). Re-run with --confirm.\n");
    process.exit(1);
  }

  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  log("wallet:", signer.address);
  log("verifiedTakes:", env.HECKLE_VERIFIED_TAKES);

  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, provider);
  const logs = await takes.queryFilter(takes.filters.TakeCommitted(), FROM_BLOCK, "latest");
  log(`found ${logs.length} legacy takes`);

  let committed = 0;
  let already = 0;
  let skipped = 0;
  let failed = 0;

  for (const lg of logs) {
    const args = (lg as ethers.EventLog).args;
    const characterId = args.characterId as bigint;
    const eventId = args.eventId as bigint;
    const takeRoot = String(args.takeRoot);
    const kind = Number(args.kind);

    try {
      const blob = (await downloadJson(takeRoot)) as {
        matchupId?: string;
        inferenceAttestation?: { signedText?: string; signature?: string; valid?: boolean };
      };
      const res = await commitVerifiedTake(signer, {
        characterId,
        eventId,
        matchupId: typeof blob?.matchupId === "string" ? blob.matchupId : undefined,
        takeRoot,
        kind,
        attestation: blob?.inferenceAttestation ?? null,
      });

      if (res.status === "committed") {
        committed++;
        log(`✓ char${characterId} ${blob?.matchupId ?? ""} ${takeRoot.slice(0, 12)}… -> take#${res.takeId ?? "?"}`);
      } else if (res.status === "already") {
        already++;
      } else {
        skipped++;
        log(`- skip (unverified) char${characterId} ${takeRoot.slice(0, 12)}…`);
      }
    } catch (err) {
      failed++;
      log(`! ${takeRoot.slice(0, 12)}…`, err instanceof Error ? err.message : err);
    }
  }

  log(`DONE committed=${committed} already=${already} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
