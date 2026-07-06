import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ethers } from "ethers";
import { requireEnv } from "./env.js";
import { uploadBytes } from "./zg-storage.js";

/** Put the Zero Cup trophy image on 0G Storage — content-addressed, so the cup
 *  the champion lifts is itself verifiable. Prints the root to wire in-app. */
async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nThis SPENDS 0G (1 storage upload). Re-run with --confirm.\n");
    process.exit(1);
  }
  const cfg = requireEnv();
  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  const signer = new ethers.Wallet(cfg.AGENT_PRIVATE_KEY, provider);
  const here = dirname(fileURLToPath(import.meta.url));
  const file = join(here, "..", "..", "web", "public", "zero-cup-trophy.avif");
  const bytes = readFileSync(file);
  const { root, uri } = await uploadBytes(signer, bytes);
  console.log(`[cup] zero-cup-trophy.avif (${bytes.length}B) -> ${root}`);
  console.log(`[cup] ${uri}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
