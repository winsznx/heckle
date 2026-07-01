import "dotenv/config";
import { ethers } from "ethers";
import {
  ZERO_CUP_R32,
  ZERO_CUP_R32_EVENT_ID,
  ARCHETYPE_IDS,
  archetype,
  storageUri,
  type ZeroCupMatchup,
} from "@heckle/shared";
import { requireEnv } from "./env.js";
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
} from "./zg-compute.js";

const KIND_PREDICTION = 1;
const EVENT_ID = BigInt(ZERO_CUP_R32_EVENT_ID ?? 2);

interface NewChar {
  archetypeId: "hater" | "optimist";
  name: string;
  handle: string;
  brief: string;
}

const NEW_CHARS: NewChar[] = [
  {
    archetypeId: "hater",
    name: "The Hater",
    handle: "the-hater",
    brief:
      "Bitter ex-player turned analyst. Sees every weakness, never sugarcoats, calls out structural flaws others miss. Predicts based on what teams will get wrong, not what they'll get right.",
  },
  {
    archetypeId: "optimist",
    name: "The Optimist",
    handle: "the-optimist",
    brief:
      "Believes every team is talented. Finds the one strength even in weak performances. Loud, encouraging, but never empty — always backs the praise with a specific observation.",
  },
];

function log(...args: unknown[]): void {
  console.log("[5c]", ...args);
}

function buildPrompt(seed: string, brief: string, m: ZeroCupMatchup): string {
  return [
    seed,
    `Your personality brief: ${brief}`,
    "",
    `Predict the outcome of this Zero Cup hackathon Round-of-32 matchup: ${m.a.name} vs ${m.b.name}.`,
    "",
    "OUTPUT RULES (obey exactly):",
    `- Output ONE line only, exactly: "<winner> over <loser>, <N>% confidence, <one-sentence technical reason>".`,
    `- <winner> MUST be exactly "${m.a.name}" or "${m.b.name}"; <loser> is the other.`,
    "- The reason must rest ONLY on technical signals: stack depth, product clarity, demo quality, slice originality.",
    "- NEVER make ad-hominem claims about teams, builders, or their judgment. No editorial commentary beyond the matchup outcome.",
    "- Stay in your character's voice, but obey every rule above.",
  ].join("\n");
}

function parseWinner(text: string, m: ZeroCupMatchup): string | null {
  const t = text.toLowerCase();
  const a = m.a.name.toLowerCase();
  const b = m.b.name.toLowerCase();
  const overIdx = t.indexOf(" over ");
  const head = overIdx >= 0 ? t.slice(0, overIdx) : t;
  if (head.includes(a) && !head.includes(b)) return m.a.name;
  if (head.includes(b) && !head.includes(a)) return m.b.name;
  const ai = t.indexOf(a);
  const bi = t.indexOf(b);
  if (ai === -1 && bi === -1) return null;
  if (ai === -1) return m.b.name;
  if (bi === -1) return m.a.name;
  return ai <= bi ? m.a.name : m.b.name;
}

const BANNED = ["idiot", "stupid", "scam", "fraud", "clown", "incompetent", "ripoff", "garbage team"];
function crossesGuardrail(text: string): boolean {
  const t = text.toLowerCase();
  return BANNED.some((w) => t.includes(w));
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (mints + up to 48 prediction takes). Re-run with --confirm.\n");
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const signer = new ethers.Wallet(env.AGENT_PRIVATE_KEY, provider);
  log("wallet:", signer.address);

  const characters = new ethers.Contract(env.HECKLE_CHARACTERS, HECKLE_CHARACTERS_ABI, signer);
  const events = new ethers.Contract(env.HECKLE_EVENTS, HECKLE_EVENTS_ABI, signer);
  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, signer);

  // 1. Resolve / mint the 3 characters (idempotent by handle).
  const mintedLogs = await characters.queryFilter(
    characters.filters.CharacterMinted(),
    36996000,
    "latest",
  );
  const handleToId = new Map<string, bigint>();
  for (const lg of mintedLogs) {
    const id = (lg as ethers.EventLog).args.tokenId as bigint;
    try {
      const meta = await characters.characterOf(id);
      handleToId.set(String(meta[1]).toLowerCase(), BigInt(id));
    } catch {
      /* skip */
    }
  }

  const roster: { id: bigint; name: string; seed: string; brief: string }[] = [
    {
      id: 0n,
      name: "The Pundit",
      seed: archetype("analyst").systemSeed,
      brief: "Veteran football analyst. Calm, tactical, reads the game three passes ahead. Numbers over narratives.",
    },
  ];

  for (const nc of NEW_CHARS) {
    let id = handleToId.get(nc.handle.toLowerCase());
    if (id === undefined) {
      log(`minting ${nc.name} ...`);
      const def = archetype(nc.archetypeId);
      const { root } = await uploadJson(signer, {
        name: nc.name,
        handle: nc.handle,
        archetype: nc.archetypeId,
        personalityBrief: nc.brief,
        systemSeed: def.systemSeed,
        createdAt: Math.floor(Date.now() / 1000),
        creator: signer.address,
      });
      const archIdx = ARCHETYPE_IDS.indexOf(nc.archetypeId);
      const rc = await (await characters.mint(storageUri(root), archIdx, nc.handle, root)).wait();
      const minted = rc?.logs
        ?.map((l: ethers.Log) => {
          try {
            return characters.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((p: ethers.LogDescription | null) => p?.name === "CharacterMinted");
      id = minted?.args?.tokenId as bigint;
      log(`minted ${nc.name} = #${id}`);
    } else {
      log(`${nc.name} already minted = #${id}`);
    }
    roster.push({ id, name: nc.name, seed: archetype(nc.archetypeId).systemSeed, brief: nc.brief });
  }

  // 2. Attach all to event 2 (idempotent).
  const attached: bigint[] = await events.attachmentsOf(EVENT_ID);
  const attachedSet = new Set(attached.map((x) => BigInt(x).toString()));
  for (const c of roster) {
    if (!attachedSet.has(c.id.toString())) {
      log(`attaching #${c.id} to event ${EVENT_ID} ...`);
      await (await events.attachCharacter(EVENT_ID, c.id)).wait();
    }
  }

  // 3. Existing (char, matchup) predictions to skip.
  const done = new Set<string>();
  const takeLogs = await takes.queryFilter(
    takes.filters.TakeCommitted(null, null, EVENT_ID),
    36996000,
    "latest",
  );
  for (const lg of takeLogs) {
    const args = (lg as ethers.EventLog).args;
    const cid = (args.characterId as bigint).toString();
    try {
      const blob = (await downloadJson(String(args.takeRoot))) as { matchupId?: string };
      if (blob?.matchupId) done.add(`${cid}:${blob.matchupId}`);
    } catch {
      /* skip */
    }
  }

  // 4. Broker.
  log("init 0G Compute broker ...");
  const broker = await getBroker(signer);
  await ensureLedger(broker);
  const choice = await pickProvider(broker);
  await prepareProvider(broker, choice.provider);
  log("provider", choice.provider, choice.model);

  // 5. Generate predictions.
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  for (const c of roster) {
    for (const m of ZERO_CUP_R32.matchups) {
      if (!force && done.has(`${c.id}:${m.id}`)) {
        skipped++;
        continue;
      }
      try {
        const prompt = buildPrompt(c.seed, c.brief, m);
        let chosen: Awaited<ReturnType<typeof generateTake>> | null = null;
        let winner: string | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          // Low temperature avoids deepseek's multilingual token-injection.
          const t = await generateTake(broker, choice.provider, choice.model, prompt, 0.2);
          const w = parseWinner(t.text, m);
          if (w && !crossesGuardrail(t.text)) {
            chosen = t;
            winner = w;
            break;
          }
          log(`  retry ${attempt + 1} (#${c.id} ${m.id}) — ${!w ? "no winner" : "guardrail"}`);
        }
        if (!chosen || !winner) {
          failed++;
          log(`  SKIPPED ${m.id} for #${c.id} after retries`);
          continue;
        }
        log(`#${c.id} ${c.name} · ${m.id}: ${winner} | ${chosen.text.replace(/\s+/g, " ")} | valid=${chosen.attestation?.valid ?? false}`);
        const { root } = await uploadJson(signer, {
          text: chosen.text,
          kind: "Prediction",
          matchupId: m.id,
          prediction: winner,
          characterId: c.id.toString(),
          triggeringEvent: { label: `${m.label}: ${m.a.name} vs ${m.b.name}`, timestamp: 0 },
          inferenceAttestation: chosen.attestation,
        });
        await (await takes.commitTake(c.id, EVENT_ID, root, KIND_PREDICTION)).wait();
        generated++;
      } catch (err) {
        failed++;
        log(`  ERROR ${m.id} #${c.id}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  log(`DONE — generated=${generated} skipped(existing)=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
