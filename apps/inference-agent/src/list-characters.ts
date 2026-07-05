import "dotenv/config";
import { ethers } from "ethers";
import { requireEnv } from "./env.js";
import { HECKLE_CHARACTERS_ABI, HECKLE_TAKES_ABI } from "./abis.js";
import { downloadJson } from "./zg-storage.js";

async function main(): Promise<void> {
  const env = requireEnv();
  const provider = new ethers.JsonRpcProvider(env.ZG_RPC_URL);
  const characters = new ethers.Contract(env.HECKLE_CHARACTERS, HECKLE_CHARACTERS_ABI, provider);
  const takes = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, provider);

  const minted = await characters.queryFilter(characters.filters.CharacterMinted(), 36996000, "latest");

  // Count takes per character from TakeCommitted logs (no takesByCharacter needed).
  const takeLogs = await takes.queryFilter(takes.filters.TakeCommitted(), 36996000, "latest");
  const counts = new Map<string, number>();
  const events = new Map<string, Set<string>>();
  for (const lg of takeLogs) {
    const a = (lg as ethers.EventLog).args;
    const cid = String(a.characterId);
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
    const set = events.get(cid) ?? new Set<string>();
    set.add(String(a.eventId));
    events.set(cid, set);
  }

  console.log(`\n=== ${minted.length} characters minted ===\n`);
  for (const lg of minted) {
    const id = (lg as ethers.EventLog).args.tokenId as bigint;
    const cid = id.toString();
    try {
      const meta = await characters.characterOf(id);
      const pblob = (await downloadJson(String(meta[2]))) as { name?: string; handle?: string };
      const evs = [...(events.get(cid) ?? new Set())].join(",") || "none";
      console.log(
        `#${cid}  ${pblob?.name ?? "(no name)"}  @${pblob?.handle ?? meta[1]}  ` +
          `archetype=${meta[0]}  takes=${counts.get(cid) ?? 0}  events=[${evs}]`,
      );
    } catch (err) {
      console.log(`#${cid}  ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
