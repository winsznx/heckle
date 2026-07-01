import "dotenv/config";
import { ethers } from "ethers";
import { ZERO_CUP_R32, archetype } from "@heckle/shared";
import { requireEnv } from "./env.js";
import {
  ensureLedger,
  generateTake,
  getBroker,
  pickProvider,
  prepareProvider,
} from "./zg-compute.js";

// Probe a provider's output quality on a prediction prompt. No commit, no upload.
// Set ZG_COMPUTE_PROVIDER / ZG_COMPUTE_MODEL to the candidate before running.
async function main(): Promise<void> {
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);

  const broker = await getBroker(signer);
  await ensureLedger(broker);
  const choice = await pickProvider(broker);
  await prepareProvider(broker, choice.provider);
  console.log("PROVIDER:", choice.provider, "| MODEL:", choice.model);

  const m = ZERO_CUP_R32.matchups[6]; // ZeroArena vs Engram
  const prompt = [
    archetype("analyst").systemSeed,
    `Predict the outcome of the Zero Cup matchup ${m.a.name} vs ${m.b.name}.`,
    `Output ONE line: "<winner> over <loser>, <N>% confidence, <one-sentence technical reason>".`,
    `Winner must be exactly "${m.a.name}" or "${m.b.name}". English only. Reason from technical signals only.`,
  ].join("\n");

  const t = await generateTake(broker, choice.provider, choice.model, prompt, 0.2);
  console.log("TEXT:", t.text);
  console.log("VALID:", t.attestation?.valid);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
