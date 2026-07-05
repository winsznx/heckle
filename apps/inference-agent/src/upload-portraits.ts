import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ethers } from "ethers";
import { requireEnv } from "./env.js";
import { uploadBytes } from "./zg-storage.js";

/**
 * Put the three heckler portraits on 0G Storage so each character's image is
 * content-addressed + independently verifiable — not just a repo asset. Prints
 * the tokenId → root map to wire into the frontend. One-off; re-running just
 * re-uploads (content-addressed → identical bytes give the identical root).
 */

const PORTRAITS: { tokenId: number; file: string }[] = [
  { tokenId: 0, file: "0.avif" },
  { tokenId: 3, file: "3.avif" },
  { tokenId: 4, file: "4.avif" },
];

function log(...a: unknown[]): void {
  console.log("[portraits]", ...a);
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (3 storage uploads). Re-run with --confirm.\n");
    process.exit(1);
  }
  const cfg = requireEnv();
  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  const signer = new ethers.Wallet(cfg.AGENT_PRIVATE_KEY, provider);
  log("wallet:", signer.address);

  const here = dirname(fileURLToPath(import.meta.url));
  const publicDir = join(here, "..", "..", "web", "public", "characters");

  const map: Record<number, string> = {};
  for (const p of PORTRAITS) {
    const bytes = readFileSync(join(publicDir, p.file));
    const { root, uri } = await uploadBytes(signer, bytes);
    map[p.tokenId] = root;
    log(`#${p.tokenId} ${p.file} (${bytes.length}B) → ${root}`);
    log(`   ${uri}`);
  }

  log("map for shared/character-portraits:");
  console.log(JSON.stringify(map, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
