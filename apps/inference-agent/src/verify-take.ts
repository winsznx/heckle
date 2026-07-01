import "dotenv/config";
import { ethers } from "ethers";
import { archetype } from "@heckle/shared";
import { requireEnv } from "./env.js";
import { uploadJson, downloadJson } from "./zg-storage.js";
import {
  ensureLedger,
  generateTake,
  getBroker,
  pickProvider,
  prepareProvider,
  type Attestation,
} from "./zg-compute.js";
import { buildTakePrompt } from "./prompt.js";

/**
 * Phase 1 validation: generate one take, fetch + verify its TEE attestation,
 * upload the blob to 0G Storage, then INDEPENDENTLY recover the signer from the
 * stored blob's signedText + signature and confirm it equals the on-chain signer.
 *
 * Run: pnpm --filter @heckle/inference-agent exec tsx src/verify-take.ts
 */
async function main(): Promise<void> {
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  console.log("wallet:", signer.address);

  const broker = await getBroker(signer);
  await ensureLedger(broker);
  const choice = await pickProvider(broker);
  await prepareProvider(broker, choice.provider);
  console.log("provider:", choice.provider, "| model:", choice.model);

  const def = archetype("hater");
  const prompt = buildTakePrompt({
    archetypeSeed: def.systemSeed,
    personalityBrief: "Attestation probe — savage and concise.",
    eventContext: "Phase 1 verification probe",
    triggerLabel: "Kickoff",
    triggerContext: "The match begins.",
    kind: "Reaction",
  });

  const take = await generateTake(broker, choice.provider, choice.model, prompt);
  console.log("\n=== TAKE ===\n" + take.text);
  console.log("\n=== ATTESTATION ===");
  console.log(JSON.stringify(take.attestation, null, 2));

  if (!take.attestation) {
    console.error(
      "\nFAIL: no attestation produced — provider likely doesn't serve signatures (TargetSeparated). Try another TeeML provider.",
    );
    process.exit(1);
  }

  const blob = {
    text: take.text,
    kind: "Reaction" as const,
    triggeringEvent: { label: "Kickoff", timestamp: 0 },
    inferenceAttestation: take.attestation,
  };
  const { root, uri } = await uploadJson(signer, blob);
  console.log("\n=== STORED BLOB ON 0G MAINNET ===");
  console.log("root:", root);
  console.log("uri: ", uri);

  // Independent re-verification straight from the stored blob (offline recovery).
  const fetched = (await downloadJson(root)) as {
    inferenceAttestation: Attestation | null;
  };
  const att = fetched.inferenceAttestation;
  if (!att) {
    console.error("\nFAIL: stored blob has no attestation.");
    process.exit(1);
  }
  const recovered = ethers.verifyMessage(att.signedText, att.signature);
  const matches = recovered.toLowerCase() === att.signer.toLowerCase();

  console.log("\n=== INDEPENDENT RE-VERIFY (from stored blob) ===");
  console.log("recovered:      ", recovered);
  console.log("expected signer:", att.signer);
  console.log("blob valid flag: ", att.valid);
  console.log("re-verify match: ", matches);

  if (!att.valid || !matches) {
    console.error("\nFAIL: attestation not valid.");
    process.exit(1);
  }
  console.log(
    "\nPASS — valid:true, signature present, recovered signer === on-chain teeSignerAddress.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
