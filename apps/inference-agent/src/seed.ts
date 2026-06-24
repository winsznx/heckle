import { ethers } from "ethers";
import { DEMO_EVENT, archetype, storageUri } from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_CHARACTERS_ABI, HECKLE_EVENTS_ABI } from "./abis.js";
import { uploadJson } from "./zg-storage.js";

/** HeckleEvents.Status enum order. */
const STATUS_LIVE = 1;

/** Personality used for the optional demo character. */
const DEMO_CHARACTER = {
  archetypeId: "analyst" as const,
  handle: "demo-analyst",
  name: "The Gaffer",
  personalityBrief:
    "Talks like a touchline manager. Loves a back-three and an early press.",
};

function log(...args: unknown[]): void {
  console.log("[seed]", ...args);
}

async function seed(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error(
      "\nThis script SPENDS 0G: it uploads to 0G Storage and sends on-chain\n" +
        "transactions (registerEvent, setStatus, optionally mint).\n\n" +
        "Re-run with --confirm to proceed:\n" +
        "  pnpm --filter @heckle/inference-agent seed -- --confirm\n",
    );
    process.exit(1);
  }

  const env = requireEnv();
  const mintDemo = process.argv.includes("--mint");

  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  log(`Owner wallet: ${signer.address}`);

  const events = new ethers.Contract(env.HECKLE_EVENTS, HECKLE_EVENTS_ABI, signer);
  const characters = new ethers.Contract(
    env.HECKLE_CHARACTERS,
    HECKLE_CHARACTERS_ABI,
    signer,
  );

  log("Uploading DEMO_EVENT metadata blob to 0G Storage ...");
  const { root: eventRoot, uri: eventUri } = await uploadJson(signer, DEMO_EVENT);
  log(`Event root ${eventRoot} (${eventUri})`);

  const startsAt = Math.floor(Date.now() / 1000);
  const endsAt = startsAt + DEMO_EVENT.durationSeconds;

  log("Registering event on-chain ...");
  const registerTx = await events.registerEvent(eventRoot, startsAt, endsAt);
  const registerReceipt = await registerTx.wait();
  log(`Registered in tx ${registerReceipt?.hash ?? registerTx.hash}`);

  const registered = registerReceipt?.logs
    ?.map((entry: ethers.Log) => {
      try {
        return events.interface.parseLog(entry);
      } catch {
        return null;
      }
    })
    .find((parsed: ethers.LogDescription | null) => parsed?.name === "EventRegistered");
  const eventId: bigint = registered?.args?.eventId ?? BigInt(DEMO_EVENT.id);
  log(`Event id ${eventId}`);

  log("Setting event status to Live ...");
  const statusTx = await events.setStatus(eventId, STATUS_LIVE);
  await statusTx.wait();
  log("Event is Live.");

  if (mintDemo) {
    log("Minting demo character ...");
    const archetypeDef = archetype(DEMO_CHARACTER.archetypeId);
    const archetypeIndex = ["homer", "hater", "analyst", "drama", "contrarian", "optimist"].indexOf(
      DEMO_CHARACTER.archetypeId,
    );

    const { root: personalityRoot } = await uploadJson(signer, {
      name: DEMO_CHARACTER.name,
      handle: DEMO_CHARACTER.handle,
      archetype: DEMO_CHARACTER.archetypeId,
      personalityBrief: DEMO_CHARACTER.personalityBrief,
      systemSeed: archetypeDef.systemSeed,
    });
    log(`Personality root ${personalityRoot} (${storageUri(personalityRoot)})`);

    const mintTx = await characters.mint(
      storageUri(personalityRoot),
      archetypeIndex,
      DEMO_CHARACTER.handle,
      personalityRoot,
    );
    const mintReceipt = await mintTx.wait();
    log(`Minted demo character in tx ${mintReceipt?.hash ?? mintTx.hash}`);
    log(
      "Attach it to the event and run the agent (src/index.ts) to generate takes.",
    );
  }

  log("Seeding complete.");
}

seed().catch((err) => {
  console.error("[seed] Fatal:", err);
  process.exit(1);
});
