import "dotenv/config";
import { ethers } from "ethers";
import { ZERO_CUP_R32 } from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_EVENTS_ABI } from "./abis.js";
import { uploadJson } from "./zg-storage.js";

const STATUS_LIVE = 1;

/**
 * Wave B: upload the Zero Cup R32 event metadata (incl. the 16 matchups) to 0G
 * Storage and register it on-chain via HeckleEvents.registerEvent, then set Live.
 *
 * Run: pnpm --filter @heckle/inference-agent exec tsx src/register-zero-cup.ts --confirm
 */
async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error(
      "\nThis SPENDS 0G (storage fee + 2 on-chain txs). Re-run with --confirm.\n",
    );
    process.exit(1);
  }

  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  console.log("owner:", signer.address);

  const events = new ethers.Contract(env.HECKLE_EVENTS, HECKLE_EVENTS_ABI, signer);

  const startsAt = Math.floor(Date.parse(ZERO_CUP_R32.startsAtISO) / 1000);
  const endsAt = Math.floor(Date.parse(ZERO_CUP_R32.endsAtISO) / 1000);

  console.log("uploading Zero Cup R32 metadata to 0G Storage ...");
  const { root: eventRoot, uri } = await uploadJson(signer, {
    title: ZERO_CUP_R32.title,
    caption: ZERO_CUP_R32.caption,
    category: "competition",
    resolutionSource: ZERO_CUP_R32.resolutionSource,
    startsAt,
    endsAt,
    matchups: ZERO_CUP_R32.matchups,
  });
  console.log("eventRoot:", eventRoot);
  console.log("uri:", uri);

  console.log("registerEvent ...");
  const tx = await events.registerEvent(eventRoot, startsAt, endsAt);
  const receipt = await tx.wait();
  console.log("registerEvent tx:", receipt?.hash ?? tx.hash);

  const registered = receipt?.logs
    ?.map((l: ethers.Log) => {
      try {
        return events.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((p: ethers.LogDescription | null) => p?.name === "EventRegistered");
  const eventId: bigint = registered?.args?.eventId ?? 0n;

  console.log("setStatus Live ...");
  await (await events.setStatus(eventId, STATUS_LIVE)).wait();

  console.log("\n=== DONE — set these in packages/shared/src/zero-cup.ts ===");
  console.log("ZERO_CUP_R32_EVENT_ID  =", eventId.toString());
  console.log("ZERO_CUP_R32_EVENT_ROOT =", eventRoot);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
