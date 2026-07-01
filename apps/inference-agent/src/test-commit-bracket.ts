import "dotenv/config";
import { ethers } from "ethers";
import { ZERO_CUP_R32, ZERO_CUP_R32_EVENT_ID } from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_BRACKETS_ABI } from "./abis.js";
import { uploadJson } from "./zg-storage.js";

// One end-to-end smoke test of HeckleBrackets (Phase 5D checkpoint 6):
// upload a dummy prediction set to 0G Storage, commit its root on-chain, read
// it back, and report actual gas. Real chain, no mocks. Guarded by --confirm.
const HECKLE_BRACKETS = "0xa1139baE1bdC2FC94A400bc8097342dB0A0f3E6B";

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (1 storage upload + 1 commitBracket). Re-run with --confirm.\n");
    process.exit(1);
  }

  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  const eventId = BigInt(ZERO_CUP_R32_EVENT_ID ?? 2);
  console.log("burner:", signer.address, "| event:", eventId.toString());

  const balBefore = await provider.getBalance(signer.address);

  // Dummy set: pick side A of each R32 matchup.
  const picks = ZERO_CUP_R32.matchups.map((m) => ({
    matchupId: m.id,
    winner: m.a.name,
  }));
  const { root, uri } = await uploadJson(signer, {
    kind: "BracketPredictionSet",
    eventId: Number(eventId),
    label: "5D deploy smoke-test bracket (dummy)",
    picks,
    submitter: signer.address,
    createdAt: Math.floor(Date.now() / 1000),
  });
  console.log("uploaded prediction set:", uri);
  console.log("predictionsRoot:", root);

  const brackets = new ethers.Contract(HECKLE_BRACKETS, HECKLE_BRACKETS_ABI, signer);
  const tx = await brackets.commitBracket(eventId, root);
  console.log("commit tx:", tx.hash);
  const rc = await tx.wait();
  const gasUsed = rc?.gasUsed ?? 0n;
  const gasPrice = rc?.gasPrice ?? 0n;
  console.log("gasUsed:", gasUsed.toString(), "| effGasPrice:", gasPrice.toString(), "wei");
  console.log("commit cost:", (Number(gasUsed * gasPrice) / 1e18).toFixed(8), "0G");

  const total: bigint = await brackets.totalBrackets();
  const b = await brackets.bracketOf(total);
  console.log(`bracketOf(${total}):`, {
    eventId: b[0].toString(),
    submitter: b[1],
    predictionsRoot: b[2],
    timestamp: b[3].toString(),
  });
  const rootMatches = String(b[2]).toLowerCase() === root.toLowerCase();
  const submitterMatches = String(b[1]).toLowerCase() === signer.address.toLowerCase();
  console.log("root round-trips:", rootMatches, "| submitter matches:", submitterMatches);

  const ids: bigint[] = await brackets.bracketsByEvent(eventId);
  console.log(`bracketsByEvent(${eventId}):`, ids.map((x) => x.toString()));

  const balAfter = await provider.getBalance(signer.address);
  console.log(
    "wallet:",
    ethers.formatEther(balBefore),
    "->",
    ethers.formatEther(balAfter),
    `(spent ${(Number(balBefore - balAfter) / 1e18).toFixed(8)} 0G incl. storage)`,
  );

  if (!rootMatches || !submitterMatches) {
    throw new Error("round-trip mismatch — on-chain record does not match commit");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
