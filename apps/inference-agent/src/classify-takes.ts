import "dotenv/config";
import { ethers } from "ethers";
import { storageUri } from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_TAKES_ABI } from "./abis.js";

/**
 * Phase 1.5 verification: enumerate every on-chain TakeCommitted for a character,
 * fetch each blob, and classify it exactly as the UI filter does — surfaced iff
 * the attestation carries a signature (verified pipeline). Proves the legacy
 * valid:false blobs are no longer surfaced.
 *
 * Run: pnpm --filter @heckle/inference-agent exec tsx src/classify-takes.ts [characterId]
 */
async function main(): Promise<void> {
  const characterId = BigInt(process.argv[2] ?? "0");
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, provider);

  const filter = takes.filters.TakeCommitted(null, characterId);
  const logs = await takes.queryFilter(filter, 36996000, "latest");
  console.log(`on-chain TakeCommitted for #${characterId}: ${logs.length}\n`);

  let surfaced = 0;
  let hidden = 0;
  let firstSurfaced: unknown = null;

  for (const log of logs) {
    const args = (log as ethers.EventLog).args;
    const root = String(args.takeRoot);
    let valid: unknown;
    let hasSig = false;
    try {
      const res = await fetch(storageUri(root));
      const blob = (await res.json()) as {
        inferenceAttestation?: { signature?: string; valid?: boolean };
      };
      const sig = blob?.inferenceAttestation?.signature;
      valid = blob?.inferenceAttestation?.valid;
      hasSig = typeof sig === "string" && sig.length > 0;
      if (hasSig && !firstSurfaced) firstSurfaced = blob?.inferenceAttestation;
    } catch {
      valid = "fetch-failed";
    }
    if (hasSig) surfaced++;
    else hidden++;
    console.log(
      `${hasSig ? "SURFACED" : "hidden  "}  root=${root.slice(0, 14)}…  valid=${valid}  signature=${hasSig}`,
    );
  }

  console.log(
    `\nSURFACED (verified pipeline): ${surfaced}   |   HIDDEN (legacy): ${hidden}`,
  );
  console.log("\nFirst surfaced take's attestation:");
  console.log(JSON.stringify(firstSurfaced, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
