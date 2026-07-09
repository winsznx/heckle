import { NextResponse } from "next/server";
import {
  buildErc8004RegistrationFile,
  erc8004AgentId,
  HECKLE_ADDRESSES,
} from "@heckle/shared";

/**
 * Serves a character's ERC-8004 registration file, pointing at the FINAL
 * ERC-7857 identity (sealed HeckleINFT contract + tokenId).
 */
const WEB_BASE = "https://tryheckle.xyz";
const INFT = HECKLE_ADDRESSES.inft;

const CHARACTERS: Record<string, { name: string; description: string }> = {
  "0": { name: "The Pundit", description: "Cold, technical analyst. Never hedges; weights demo polish and product-market fit." },
  "3": { name: "The Hater", description: "Bitter ex-player turned analyst. Sees every weakness; predicts what teams get wrong." },
  "4": { name: "The Optimist", description: "Believes every team is talented. Backs praise with a specific technical observation." },
  "5": { name: "The Homer", description: "Ride-or-die superfan. Every call breaks their team's way; loyalty over logic." },
  "6": { name: "The Firebrand", description: "Pure drama. Every moment is the most important moment in history." },
  "7": { name: "The Contrarian", description: "Whatever the consensus is, they're against it — on purpose, straight-faced." },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const { tokenId } = await params;
  const c = CHARACTERS[tokenId];
  if (!c) return NextResponse.json({ error: "unknown character" }, { status: 404 });
  if (!INFT) {
    return NextResponse.json(
      { error: "registration pending ERC-7857 migration" },
      { status: 503 },
    );
  }
  const file = buildErc8004RegistrationFile({
    name: c.name,
    description: c.description,
    image: `${WEB_BASE}/characters/${tokenId}.avif`,
    webEndpoint: `${WEB_BASE}/characters/${tokenId}`,
    inftContract: INFT,
    tokenId: Number(tokenId),
    agentId: erc8004AgentId(Number(tokenId)),
  });
  return NextResponse.json(file, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
