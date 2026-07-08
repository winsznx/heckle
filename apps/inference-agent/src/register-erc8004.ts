import "dotenv/config";
import { ethers } from "ethers";
import {
  ERC8004_ADDRESSES,
  buildErc8004RegistrationFile,
  erc8004RegistryRef,
} from "@heckle/shared";
import { requireEnv } from "./env.js";
import { ERC8004_IDENTITY_ABI } from "./abis.js";

/**
 * Register migrated Heckle characters on 0G's live ERC-8004 IdentityRegistry.
 * The registration file points at each character's ERC-7857 identity (the final
 * HeckleINFT contract + tokenId) — NEVER the legacy V1 token.
 *
 *   --check    read-only readiness (registry live, INFT set, files valid, dry run)
 *   --confirm  broadcast register(agentURI) per character (IRREVERSIBLE-ish)
 *
 * Run --confirm only AFTER migrate has minted the characters on HeckleINFT.
 */
const WEB_BASE = process.env.HECKLE_WEB_BASE || "https://tryheckle.xyz";

const CHARACTERS: { tokenId: number; name: string; description: string; slug: string }[] = [
  { tokenId: 0, name: "The Pundit", slug: "the-pundit", description: "Cold, technical analyst. Never hedges; weights demo polish and product-market fit." },
  { tokenId: 3, name: "The Hater", slug: "the-hater", description: "Bitter ex-player turned analyst. Sees every weakness; predicts what teams get wrong." },
  { tokenId: 4, name: "The Optimist", slug: "the-optimist", description: "Believes every team is talented. Backs praise with a specific technical observation." },
];

function log(...a: unknown[]): void {
  console.log("[erc8004]", ...a);
}

function fileFor(inft: string, c: (typeof CHARACTERS)[number], agentId?: number) {
  return buildErc8004RegistrationFile({
    name: c.name,
    description: c.description,
    image: `${WEB_BASE}/characters/${c.tokenId}/portrait.avif`,
    webEndpoint: `${WEB_BASE}/characters/${c.tokenId}`,
    inftContract: inft,
    tokenId: c.tokenId,
    agentId,
  });
}

function validateFile(f: Record<string, unknown>): string[] {
  const errs: string[] = [];
  if (f.type !== "https://eips.ethereum.org/EIPS/eip-8004#registration-v1") errs.push("bad type");
  if (typeof f.name !== "string" || !f.name) errs.push("missing name");
  const services = f.services as { name: string; endpoint: string }[] | undefined;
  if (!services?.some((s) => s.name === "0g-agentic-id" && /^eip155:\d+:0x[a-fA-F0-9]{40}\/\d+$/.test(s.endpoint))) {
    errs.push("missing/invalid 0g-agentic-id service");
  }
  return errs;
}

async function main(): Promise<void> {
  const mode = process.argv.includes("--confirm") ? "confirm" : "check";
  const cfg = requireEnv();
  const provider = new ethers.JsonRpcProvider(cfg.ZG_RPC_URL);
  const inft = process.env.HECKLE_INFT;

  log(`mode: ${mode}`);
  log(`registry: ${ERC8004_ADDRESSES.identity} (${erc8004RegistryRef()})`);

  // 1) Registry live on 0G?
  const code = await provider.getCode(ERC8004_ADDRESSES.identity);
  const live = code !== "0x" && code.length > 2;
  log(`registry on-chain: ${live ? "LIVE ✓" : "NOT FOUND ✗"} (${code.length} bytes code)`);

  // 2) INFT identity ready?
  if (!inft) {
    log("HECKLE_INFT: NOT SET — registration is blocked until migrate mints the ERC-7857 characters.");
  } else {
    log(`HECKLE_INFT: ${inft} (registration will point here)`);
  }

  // 3) Registration files valid?
  let allValid = true;
  for (const c of CHARACTERS) {
    const f = fileFor(inft ?? "0x0000000000000000000000000000000000000000", c);
    const errs = validateFile(f);
    if (errs.length) allValid = false;
    const svc = (f.services as { name: string; endpoint: string }[]).find((s) => s.name === "0g-agentic-id");
    log(`#${c.tokenId} ${c.name}: file ${errs.length ? "INVALID (" + errs.join(", ") + ")" : "valid ✓"} · ${svc?.endpoint}`);
  }

  if (mode === "check") {
    const ready = live && Boolean(inft) && allValid;
    log(`READINESS: ${ready ? "READY to register after migrate ✓" : "NOT READY (see above)"}`);
    log("No broadcast (check mode). Re-run with --confirm after migrate to register.");
    return;
  }

  // --confirm: broadcast
  if (!live || !inft) throw new Error("Not ready: registry must be live and HECKLE_INFT set.");
  const signer = new ethers.Wallet(cfg.AGENT_PRIVATE_KEY, provider);
  const registry = new ethers.Contract(ERC8004_ADDRESSES.identity, ERC8004_IDENTITY_ABI, signer);
  const agents: Record<number, number> = {};
  for (const c of CHARACTERS) {
    const agentURI = `${WEB_BASE}/api/agents/${c.tokenId}`;
    const tx = await registry.register(agentURI);
    const rc = await tx.wait();
    let agentId: bigint | undefined;
    for (const lg of rc?.logs ?? []) {
      try {
        const p = registry.interface.parseLog(lg);
        if (p?.name === "Registered") agentId = p.args.agentId as bigint;
      } catch {
        /* not ours */
      }
    }
    if (agentId === undefined) throw new Error(`#${c.tokenId} no agentId in receipt`);
    agents[c.tokenId] = Number(agentId);
    log(`#${c.tokenId} ${c.name} registered → agentId ${agentId} (${agentURI})`);
  }
  log("Add to packages/shared/src/erc8004.ts ERC8004_AGENTS:", JSON.stringify(agents));
  log("DONE.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
