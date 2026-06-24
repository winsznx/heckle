import { ethers } from "ethers";
import {
  ARCHETYPE_IDS,
  DEMO_EVENT,
  archetype,
  storageUri,
  type ArchetypeId,
  type EventTrigger,
  type TakeKind,
} from "@heckle/shared";
import { requireEnv, type ResolvedEnv } from "./env.js";
import {
  HECKLE_CHARACTERS_ABI,
  HECKLE_EVENTS_ABI,
  HECKLE_TAKES_ABI,
} from "./abis.js";
import { uploadJson, downloadJson } from "./zg-storage.js";
import {
  ensureLedger,
  generateTake,
  getBroker,
  pickProvider,
  prepareProvider,
  type Broker,
  type ProviderChoice,
} from "./zg-compute.js";
import { buildTakePrompt } from "./prompt.js";

const KIND_TO_ENUM: Record<TakeKind, number> = {
  Reaction: 0,
  Prediction: 1,
  Debate: 2,
};

const POLL_INTERVAL_MS = 8_000;
const WINNING_TEAM = DEMO_EVENT.predictionFields.find(
  (f) => f.field === "winner",
)?.resolvedValue;

interface CharacterRecord {
  archetype: number;
  handle: string;
  personalityRoot: string;
  creator: string;
  createdAt: bigint;
}

interface PersonalityBlob {
  name?: string;
  handle?: string;
  personalityBrief?: string;
}

interface TakeBlob {
  text: string;
  kind: TakeKind;
  triggeringEvent: { label: string; timestamp: number };
  prediction?: string;
  inferenceAttestation: { signer: string; valid: boolean; chatId: string };
}

function archetypeIdFromIndex(index: number): ArchetypeId {
  const id = ARCHETYPE_IDS[index];
  if (!id) throw new Error(`Unknown archetype index: ${index}`);
  return id;
}

function log(...args: unknown[]): void {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

async function resolvePersonality(
  characters: ethers.Contract,
  characterId: bigint,
): Promise<{ record: CharacterRecord; name: string; personalityBrief: string }> {
  const raw = await characters.characterOf(characterId);
  const record: CharacterRecord = {
    archetype: Number(raw[0]),
    handle: String(raw[1]),
    personalityRoot: String(raw[2]),
    creator: String(raw[3]),
    createdAt: BigInt(raw[4]),
  };

  let name = record.handle;
  let personalityBrief = "";

  try {
    const uri: string = await characters.tokenURI(characterId);
    const root = parseRootFromUri(uri) ?? record.personalityRoot;
    const blob = (await downloadJson(root)) as PersonalityBlob;
    name = blob.name ?? blob.handle ?? record.handle;
    personalityBrief = blob.personalityBrief ?? "";
  } catch (err) {
    log(
      `  ! could not load personality blob for #${characterId}, falling back to handle:`,
      err instanceof Error ? err.message : err,
    );
  }

  return { record, name, personalityBrief };
}

function parseRootFromUri(uri: string): string | null {
  const match = uri.match(/root=(0x[0-9a-fA-F]+)/);
  if (match) return match[1];
  if (uri.startsWith("0x")) return uri;
  return null;
}

function extractPrediction(text: string): string | undefined {
  const match = text.match(/prediction:\s*(.+)$/im);
  return match ? match[1].trim() : undefined;
}

async function processTrigger(
  broker: Broker,
  choice: ProviderChoice,
  takes: ethers.Contract,
  characterId: bigint,
  archetypeSeed: string,
  personalityBrief: string,
  signer: ethers.Wallet,
  trigger: EventTrigger,
): Promise<void> {
  log(`  → beat "${trigger.label}" (${trigger.kind}) for character #${characterId}`);

  const prompt = buildTakePrompt({
    archetypeSeed,
    personalityBrief,
    eventContext: `${DEMO_EVENT.title} — ${DEMO_EVENT.description}`,
    triggerLabel: trigger.label,
    triggerContext: trigger.context,
    kind: trigger.kind,
  });

  const take = await generateTake(broker, choice.provider, choice.model, prompt);
  const prediction =
    trigger.kind === "Prediction" ? extractPrediction(take.text) : undefined;

  log(`    take: ${take.text.replace(/\s+/g, " ")}`);
  log(`    attestation valid=${take.valid} chatId=${take.chatId}`);

  const blob: TakeBlob = {
    text: take.text,
    kind: trigger.kind,
    triggeringEvent: { label: trigger.label, timestamp: trigger.atSeconds },
    ...(prediction ? { prediction } : {}),
    inferenceAttestation: {
      signer: choice.provider,
      valid: take.valid,
      chatId: take.chatId,
    },
  };

  const { root, uri } = await uploadJson(signer, blob);
  log(`    stored take → ${uri}`);

  const tx = await takes.commitTake(
    characterId,
    BigInt(DEMO_EVENT.id),
    root,
    KIND_TO_ENUM[trigger.kind],
  );
  const receipt = await tx.wait();
  log(`    committed on-chain in tx ${receipt?.hash ?? tx.hash}`);
}

async function processCharacter(
  broker: Broker,
  choice: ProviderChoice,
  characters: ethers.Contract,
  takes: ethers.Contract,
  signer: ethers.Wallet,
  characterId: bigint,
): Promise<void> {
  log(`Processing character #${characterId} ...`);
  const { record, name, personalityBrief } = await resolvePersonality(
    characters,
    characterId,
  );

  const archetypeDef = archetype(archetypeIdFromIndex(record.archetype));
  log(
    `  ${name} — archetype ${archetypeDef.label} (#${record.archetype}), root ${storageUri(
      record.personalityRoot,
    )}`,
  );

  for (const trigger of DEMO_EVENT.triggers) {
    await processTrigger(
      broker,
      choice,
      takes,
      characterId,
      archetypeDef.systemSeed,
      personalityBrief,
      signer,
      trigger,
    );
  }

  await gradeWinnerPrediction(takes, characterId);
  log(`Done with character #${characterId}.`);
}

async function gradeWinnerPrediction(
  takes: ethers.Contract,
  characterId: bigint,
): Promise<void> {
  const correct = WINNING_TEAM === "North End FC";
  log(
    `  grading winner prediction for #${characterId}: ground truth ${WINNING_TEAM}, correct=${correct}`,
  );
  const tx = await takes.gradePrediction(characterId, correct);
  const receipt = await tx.wait();
  log(`  graded on-chain in tx ${receipt?.hash ?? tx.hash}`);
}

async function main(): Promise<void> {
  let resolved: ResolvedEnv;
  try {
    resolved = requireEnv();
  } catch (err) {
    console.error("\nHeckle inference agent cannot start.\n");
    console.error(err instanceof Error ? err.message : err);
    console.error(
      "\nSet AGENT_PRIVATE_KEY and the HECKLE_* contract addresses, then re-run.\n",
    );
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(resolved.ZG_RPC_URL);
  const signer = new ethers.Wallet(resolved.AGENT_PRIVATE_KEY, provider);
  log(`Agent wallet: ${signer.address}`);
  log(`Watching HeckleEvents for CharacterAttached on event ${DEMO_EVENT.id}`);

  const events = new ethers.Contract(
    resolved.HECKLE_EVENTS,
    HECKLE_EVENTS_ABI,
    provider,
  );
  const characters = new ethers.Contract(
    resolved.HECKLE_CHARACTERS,
    HECKLE_CHARACTERS_ABI,
    provider,
  );
  const takes = new ethers.Contract(
    resolved.HECKLE_TAKES,
    HECKLE_TAKES_ABI,
    signer,
  );

  log("Initializing 0G Compute broker ...");
  const broker = await getBroker(signer);
  await ensureLedger(broker);
  const choice = await pickProvider(broker);
  await prepareProvider(broker, choice.provider);
  log(`Using provider ${choice.provider} (model ${choice.model})`);

  const processed = new Set<string>();
  const eventId = BigInt(DEMO_EVENT.id);

  const enqueue = async (characterId: bigint): Promise<void> => {
    const key = characterId.toString();
    if (processed.has(key)) return;
    processed.add(key);
    try {
      await processCharacter(broker, choice, characters, takes, signer, characterId);
    } catch (err) {
      processed.delete(key);
      log(
        `Error processing character #${characterId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  };

  const existing: bigint[] = await events.attachmentsOf(eventId);
  log(`Found ${existing.length} already-attached character(s).`);
  for (const id of existing) {
    await enqueue(BigInt(id));
  }

  const attachedFilter = events.filters.CharacterAttached(eventId);
  await events.on(attachedFilter, (_eventId, characterId) => {
    void enqueue(BigInt(characterId));
  });

  log(`Live. Polling every ${POLL_INTERVAL_MS / 1000}s for new attachments.`);
  setInterval(() => {
    void (async () => {
      try {
        const ids: bigint[] = await events.attachmentsOf(eventId);
        for (const id of ids) await enqueue(BigInt(id));
      } catch (err) {
        log("Poll error:", err instanceof Error ? err.message : err);
      }
    })();
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
