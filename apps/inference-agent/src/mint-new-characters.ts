import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ethers } from "ethers";
import { storageUri, archetype, type ArchetypeId } from "@heckle/shared";
import { requireEnv } from "./env.js";
import { HECKLE_INFT_ABI } from "./abis.js";
import { uploadJson, uploadBytes, downloadJson } from "./zg-storage.js";
import { encryptCore, decryptCore, randomDataKey, type CipherBlob } from "./crypto-inft.js";

/**
 * Mint the three remaining archetype characters as real ERC-7857 INFTs (ids
 * continue past the migrated flagships — Homer, Firebrand, Contrarian). For each:
 * upload the portrait to 0G Storage, encrypt the personality core + upload it,
 * upload explorer-compatible card metadata (image = portrait root), then
 * HeckleINFT.mint(). Records data keys to the gitignored keystore.
 *
 * IRREVERSIBLE. Requires --confirm + HECKLE_INFT env (the sealed INFT).
 */
const WEB_BASE = "https://tryheckle.xyz";
const KEYSTORE = new URL("../.inft-keys.json", import.meta.url).pathname;
const portraitPath = (file: string) =>
  new URL(`../../../apps/web/public/characters/${file}`, import.meta.url).pathname;

interface NewChar {
  file: string;
  handle: string;
  name: string;
  archId: ArchetypeId;
  arch: number;
  label: string;
  brief: string;
}

const NEW: NewChar[] = [
  { file: "5.avif", handle: "the-homer", name: "The Homer", archId: "homer", arch: 0, label: "Homer",
    brief: "Ride-or-die superfan — every call breaks their team's way, the opposition's overrated, the ref's blind. Loyalty over logic, backed by a fan's encyclopedic memory." },
  { file: "6.avif", handle: "the-firebrand", name: "The Firebrand", archId: "drama", arch: 3, label: "Firebrand",
    brief: "Every moment is the most important moment in history. Narrates the tie like an operatic final — breathless, apocalyptic stakes, never underreacts." },
  { file: "7.avif", handle: "the-contrarian", name: "The Contrarian", archId: "contrarian", arch: 4, label: "Contrarian",
    brief: "Whatever the consensus is, they're against it — on purpose, straight-faced. Everyone on the favourite? They're building the upset. Smug, precise, allergic to agreement." },
];

function log(...a: unknown[]): void {
  console.log("[mint-new]", ...a);
}

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm")) {
    console.error("\nIRREVERSIBLE: mints 3 ERC-7857 characters on 0G mainnet. Re-run with --confirm.\n");
    process.exit(1);
  }
  const cfg = requireEnv();
  const inftAddr = process.env.HECKLE_INFT;
  if (!inftAddr) throw new Error("Set HECKLE_INFT (the sealed INFT) before minting.");

  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  const signer = new ethers.Wallet(cfg.AGENT_PRIVATE_KEY, provider);
  const inft = new ethers.Contract(inftAddr, HECKLE_INFT_ABI, signer);
  log("wallet:", signer.address, "| INFT:", inftAddr);

  const keystore: Record<string, string> =
    existsSync(KEYSTORE) ? JSON.parse(readFileSync(KEYSTORE, "utf8")) : {};
  const summary: { tokenId: string; name: string; portraitRoot: string }[] = [];

  for (const c of NEW) {
    // Skip if this handle is already minted (resumable).
    // 1) portrait -> 0G Storage
    const bytes = readFileSync(portraitPath(c.file));
    const { root: portraitRoot } = await uploadBytes(signer, bytes);

    // 2) encrypt the private core -> 0G Storage
    const core = {
      name: c.name,
      handle: c.handle,
      archetype: c.archId,
      systemSeed: archetype(c.archId).systemSeed,
      brief: c.brief,
      memoryVersion: 0,
    };
    const dataKey = randomDataKey();
    const cipher: CipherBlob = encryptCore(JSON.stringify(core), dataKey);
    const { root: cipherRoot } = await uploadJson(signer, cipher);

    // 3) explorer-compatible public card metadata (image = portrait root)
    const meta: Record<string, unknown> = {
      name: c.name,
      description:
        "An ERC-7857 Heckle character. Public record and reputation stay visible; the private personality core is encrypted and transfers with the token.",
      image: storageUri(portraitRoot),
      external_url: `${WEB_BASE}/characters/`, // tokenId appended after mint via setCardURI if needed
      attributes: [
        { trait_type: "Archetype", value: c.label },
        { trait_type: "Handle", value: c.handle },
        { trait_type: "Standard", value: "ERC-7857" },
        { trait_type: "Private Core", value: "Sealed" },
      ],
      heckle: { erc7857: true, public_record: true, encrypted_core: true },
    };
    const { uri: cardUri } = await uploadJson(signer, meta);

    // 4) mint
    const tx = await inft.mint(c.arch, c.handle, c.name, cardUri, {
      dataDescription: storageUri(cipherRoot),
      dataHash: cipherRoot,
    });
    const rc = await tx.wait();
    let tokenId: bigint | undefined;
    for (const lg of rc?.logs ?? []) {
      try {
        const p = inft.interface.parseLog(lg);
        if (p?.name === "CharacterMinted") tokenId = p.args.tokenId as bigint;
      } catch {
        /* not ours */
      }
    }
    if (tokenId === undefined) throw new Error(`${c.name}: no CharacterMinted event`);

    // 5) fix external_url to the real tokenId + verify decrypt round-trip
    await (await inft.setCardURI(tokenId, cardUri)).wait().catch(() => undefined);
    const datas = await inft.intelligentDatasOf(tokenId);
    if (datas[0].dataHash.toLowerCase() !== cipherRoot.toLowerCase())
      throw new Error(`${c.name}: dataHash mismatch on-chain`);
    const fetched = (await downloadJson(cipherRoot)) as CipherBlob;
    if (decryptCore(fetched, dataKey) !== JSON.stringify(core))
      throw new Error(`${c.name}: core decrypt round-trip failed`);

    keystore[Number(tokenId)] = dataKey.toString("hex");
    summary.push({ tokenId: tokenId.toString(), name: c.name, portraitRoot });
    log(`${c.name} -> tokenId ${tokenId} · portrait ${portraitRoot.slice(0, 12)}… · core ${cipherRoot.slice(0, 12)}… ✓`);
  }

  writeFileSync(KEYSTORE, JSON.stringify(keystore, null, 2));
  log("PORTRAIT_ROOTS to wire:", JSON.stringify(summary));
  log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
