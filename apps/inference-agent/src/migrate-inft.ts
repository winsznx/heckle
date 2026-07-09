import "dotenv/config";
import { writeFileSync } from "node:fs";
import { ethers } from "ethers";
import { storageUri } from "@heckle/shared";
import { requireEnv, env } from "./env.js";
import { HECKLE_CHARACTERS_ABI, HECKLE_INFT_ABI } from "./abis.js";
import { uploadJson, downloadJson } from "./zg-storage.js";
import {
  decryptCore,
  encryptCore,
  publicKeyOf,
  randomDataKey,
  sealKeyTo,
  type CipherBlob,
} from "./crypto-inft.js";

/**
 * Migrate the V1 characters (tokenIds 0,1,2) onto the real ERC-7857 HeckleINFT,
 * PRESERVING tokenIds. For each character:
 *   - read V1 owner + metadata + personality blob
 *   - split PUBLIC card (name, archetype, handle, bio, portrait) from PRIVATE
 *     core (system seed, strategy, memory)
 *   - encrypt the private core (AES-256-GCM), upload ciphertext to 0G Storage
 *   - upload the public card to 0G Storage
 *   - migrateMint(tokenId, owner, …, {dataDescription: ciphertextURI, dataHash})
 *   - record the data key (gitignored keystore) so the oracle can re-seal on
 *     transfer and the agent can decrypt for generation
 *   - verify: on-chain dataHash matches + owner decrypts the core round-trip
 * Then sealMigration() so public minting can't squat these ids.
 *
 * IRREVERSIBLE (mints on mainnet). Requires --confirm AND the deployed addresses
 * in env: HECKLE_INFT, HECKLE_DATA_VERIFIER. Run only after DeployINFT.
 */
const PUBLIC_FIELDS = ["name", "archetype", "handle", "bio", "description", "portrait", "portraitRoot", "imageRoot", "avatar"];
const KEYSTORE = new URL("../.inft-keys.json", import.meta.url).pathname;
const WEB_BASE = "https://tryheckle.xyz";

// Flagship display metadata — portrait roots already on 0G Storage.
const FLAGSHIP: Record<number, { portraitRoot: string; archetypeLabel: string }> = {
  0: { portraitRoot: "0x8698ab864319b8b5797c7007d2bee3c817266eaeb1c73a91c691a0467f709825", archetypeLabel: "Analyst" },
  3: { portraitRoot: "0xb07cad2324c9b4f4aebb972b133e11ae8b3b152fc5ed138c4a088317d716898c", archetypeLabel: "Hater" },
  4: { portraitRoot: "0x0ac19b075b005f1ca9e31843a6c1d706a3f17cdafe2bbe7a75045e4e5adfbe9c", archetypeLabel: "Optimist" },
};

function log(...a: unknown[]): void {
  console.log("[migrate-inft]", ...a);
}

interface SplitResult {
  card: Record<string, unknown>;
  core: Record<string, unknown>;
}

function splitPersonality(blob: Record<string, unknown>): SplitResult {
  const card: Record<string, unknown> = {};
  const core: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(blob)) {
    if (PUBLIC_FIELDS.includes(k)) card[k] = v;
    else core[k] = v;
  }
  return { card, core };
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nIRREVERSIBLE: mints the ERC-7857 characters on 0G mainnet. Re-run with --confirm.\n");
    process.exit(1);
  }
  const cfg = requireEnv();
  const inftAddr = process.env.HECKLE_INFT;
  const verifierAddr = process.env.HECKLE_DATA_VERIFIER;
  if (!inftAddr || !verifierAddr) {
    throw new Error("Set HECKLE_INFT and HECKLE_DATA_VERIFIER (from DeployINFT) before migrating.");
  }

  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  const signer = new ethers.Wallet(cfg.AGENT_PRIVATE_KEY, provider);
  log("wallet:", signer.address, "| INFT:", inftAddr);

  const v1 = new ethers.Contract(cfg.HECKLE_CHARACTERS, HECKLE_CHARACTERS_ABI, provider);
  const inft = new ethers.Contract(inftAddr, HECKLE_INFT_ABI, signer);

  // Migrate ONLY the flagship characters — The Pundit (0), The Hater (3), The
  // Optimist (4). #1/#2 are user-created; they stay on V1. Override with
  // HECKLE_MIGRATE_IDS.
  const MIGRATE_IDS = (process.env.HECKLE_MIGRATE_IDS?.split(",").map((s) => Number(s.trim())))
    ?? [0, 3, 4];
  log(`migrating tokenIds: ${MIGRATE_IDS.join(", ")}`);
  const keystore: Record<string, string> = {};

  for (const tokenId of MIGRATE_IDS) {
    const owner: string = await v1.ownerOf(tokenId);

    // Resumable: skip ids already minted on the INFT (migrateMint reverts on an
    // existing id, and the 0G RPC is flaky — a partial run must be safe to retry).
    try {
      const existing: string = await inft.ownerOf(tokenId);
      log(`#${tokenId} already on INFT (owner ${existing}) — skipping`);
      continue;
    } catch {
      /* not minted yet — proceed */
    }

    const c = await v1.characterOf(tokenId);
    const personality = (await downloadJson(String(c.personalityRoot))) as Record<string, unknown>;
    const { card, core } = splitPersonality(personality);
    const name = typeof card.name === "string" ? card.name : `Heckler #${tokenId}`;

    // Encrypt the private core; upload ciphertext + public card to 0G Storage.
    const dataKey = randomDataKey();
    const cipher: CipherBlob = encryptCore(JSON.stringify(core), dataKey);
    const { root: cipherRoot } = await uploadJson(signer, cipher);
    // Explorer-compatible ERC-721 metadata (name/description/image/attributes),
    // image = the portrait already on 0G Storage (NOT the encrypted core).
    const flag = FLAGSHIP[tokenId];
    const cardMeta: Record<string, unknown> = {
      name,
      description:
        "An ERC-7857 Heckle character. Public record and reputation stay visible; the private personality core is encrypted and transfers with the token.",
      external_url: `${WEB_BASE}/characters/${tokenId}`,
      attributes: [
        { trait_type: "Archetype", value: flag?.archetypeLabel ?? String(c.archetype) },
        { trait_type: "Handle", value: c.handle },
        { trait_type: "Standard", value: "ERC-7857" },
        { trait_type: "Private Core", value: "Sealed" },
      ],
      heckle: { erc7857: true, public_record: true, encrypted_core: true },
    };
    if (flag) cardMeta.image = storageUri(flag.portraitRoot);
    void card;
    const { root: cardRoot, uri: cardUri } = await uploadJson(signer, cardMeta);

    log(`#${tokenId} ${name}: owner=${owner} card=${cardRoot.slice(0, 10)}… core=${cipherRoot.slice(0, 10)}…`);

    const tx = await inft.migrateMint(
      tokenId,
      owner,
      Number(c.archetype),
      c.handle,
      name,
      cardUri,
      { dataDescription: storageUri(cipherRoot), dataHash: cipherRoot },
    );
    await tx.wait();
    keystore[tokenId] = dataKey.toString("hex");

    // Verify: on-chain dataHash matches + owner can decrypt the core round-trip.
    const datas = await inft.intelligentDatasOf(tokenId);
    if (datas[0].dataHash.toLowerCase() !== cipherRoot.toLowerCase()) {
      throw new Error(`#${tokenId} dataHash mismatch on-chain`);
    }
    const fetched = (await downloadJson(cipherRoot)) as CipherBlob;
    const decrypted = decryptCore(fetched, dataKey);
    if (decrypted !== JSON.stringify(core)) throw new Error(`#${tokenId} core decrypt round-trip failed`);
    // Sanity: the owner's sealed key unseals (agent operates the owner key here).
    void sealKeyTo(publicKeyOf(cfg.AGENT_PRIVATE_KEY), dataKey);
    const newOwner: string = await inft.ownerOf(tokenId);
    const preserved = newOwner.toLowerCase() === owner.toLowerCase();
    log(
      `#${tokenId} ✓ migrated: owner ${owner} -> ${newOwner} ${preserved ? "(preserved ✓)" : "(MISMATCH ✗)"}`,
    );
  }

  writeFileSync(KEYSTORE, JSON.stringify(keystore, null, 2));
  log(`data keys written to ${KEYSTORE} (gitignored)`);

  if (process.argv.includes("--seal")) {
    const sealTx = await inft.sealMigration();
    await sealTx.wait();
    log("sealMigration() done — public minting open, V1 ids can't be squatted.");
  } else {
    log("PAUSED before sealMigration() — migration NOT sealed. Re-run with --seal after approval.");
  }
  log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
