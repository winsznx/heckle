import "dotenv/config";
import { ethers } from "ethers";
import { ZERO_CUP_R32, ZERO_CUP_R32_EVENT_ID } from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_BRACKETS_ABI } from "./abis.js";

// Fresh-user end-to-end (Phase 5D checkpoint 10): a brand-new wallet builds a
// full 16-pick R32 bracket, uploads it through the PRODUCTION /api/upload-bracket
// route (agent-paid 0G Storage), then commits its root on-chain from its own key.
// Proves an arbitrary user — not the deployer/agent — can commit. No mocks.
const HECKLE_BRACKETS = "0xa1139baE1bdC2FC94A400bc8097342dB0A0f3E6B";
const BASE_URL = process.env.E2E_BASE_URL ?? "https://tryheckle.xyz";
const FUND_AMOUNT = "0.01";

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (funds a fresh wallet + commits). Re-run with --confirm.\n");
    process.exit(1);
  }

  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const funder = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);

  const fresh = ethers.Wallet.createRandom().connect(provider);
  console.log("fresh user wallet:", fresh.address);
  console.log("funder (agent)   :", funder.address);

  const funderBefore = await provider.getBalance(funder.address);

  // 1. Build a full 16-pick R32 bracket (side A of each matchup).
  const eventId = BigInt(ZERO_CUP_R32_EVENT_ID ?? 2);
  const picks = ZERO_CUP_R32.matchups.map((m) => ({
    matchupId: m.id,
    winner: m.a.name,
  }));
  console.log(`built ${picks.length}/16 R32 picks`);

  // 2. Upload via the PRODUCTION storage route (as the browser does). Done
  // before funding so a transient storage flake never strands funds.
  const uploadRes = await fetch(`${BASE_URL}/api/upload-bracket`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "BracketPredictionSet",
      eventId: Number(eventId),
      submitter: fresh.address,
      picks,
      createdAt: Math.floor(Date.now() / 1000),
    }),
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new Error(`upload route ${uploadRes.status}: ${body}`);
  }
  const { root, uri } = (await uploadRes.json()) as { root: string; uri: string };
  console.log("uploaded via", `${BASE_URL}/api/upload-bracket`);
  console.log("predictionsRoot:", root);
  console.log("blob:", uri);

  // 3. Fund the fresh wallet for gas.
  console.log(`funding ${FUND_AMOUNT} 0G ...`);
  const fundTx = await funder.sendTransaction({
    to: fresh.address,
    value: ethers.parseEther(FUND_AMOUNT),
  });
  await fundTx.wait();
  console.log("fund tx:", fundTx.hash);

  // 4. Commit from the fresh wallet.
  const brackets = new ethers.Contract(HECKLE_BRACKETS, HECKLE_BRACKETS_ABI, fresh);
  const tx = await brackets.commitBracket(eventId, root);
  console.log("commit tx:", tx.hash);
  const rc = await tx.wait();
  const gasUsed = rc?.gasUsed ?? 0n;
  const gasPrice = rc?.gasPrice ?? 0n;
  console.log("commit gasUsed:", gasUsed.toString(), "cost:", (Number(gasUsed * gasPrice) / 1e18).toFixed(8), "0G");

  // 5. Verify on-chain round-trip.
  const total: bigint = await brackets.totalBrackets();
  const b = await brackets.bracketOf(total);
  const ids: bigint[] = await brackets.bracketsBySubmitter(fresh.address);
  const rootOk = String(b[2]).toLowerCase() === root.toLowerCase();
  const submitterOk = String(b[1]).toLowerCase() === fresh.address.toLowerCase();
  const indexedOk = ids.length === 1 && ids[0] === total;
  console.log(`bracketId: ${total} | root ✓ ${rootOk} | submitter ✓ ${submitterOk} | bySubmitter ✓ ${indexedOk}`);

  const funderAfter = await provider.getBalance(funder.address);
  console.log(
    "funder spent (fund + gas):",
    (Number(funderBefore - funderAfter) / 1e18).toFixed(8),
    "0G | funder now:",
    ethers.formatEther(funderAfter),
  );

  if (!rootOk || !submitterOk || !indexedOk) {
    throw new Error("fresh-user round-trip mismatch");
  }
  console.log("E2E_OK");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
