import { NextResponse } from "next/server";
import { buildErc8004RegistrationFile, erc8004AgentId } from "@heckle/shared";

/**
 * Serves a character's ERC-8004 registration file. Points at the FINAL ERC-7857
 * identity (HeckleINFT contract + tokenId). Returns 503 until the migration has
 * set NEXT_PUBLIC_HECKLE_INFT, so a registration can never bind to the V1 token.
 */
const WEB_BASE = "https://tryheckle.xyz";
const INFT = process.env.NEXT_PUBLIC_HECKLE_INFT;

const CHARACTERS: Record<string, { name: string; description: string }> = {
  "0": { name: "The Pundit", description: "Cold, technical analyst. Never hedges; weights demo polish and product-market fit." },
  "1": { name: "The Hater", description: "Bitter ex-player turned analyst. Sees every weakness; predicts what teams get wrong." },
  "2": { name: "The Optimist", description: "Believes every team is talented. Backs praise with a specific technical observation." },
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
    image: `${WEB_BASE}/characters/${tokenId}/portrait.avif`,
    webEndpoint: `${WEB_BASE}/characters/${tokenId}`,
    inftContract: INFT,
    tokenId: Number(tokenId),
    agentId: erc8004AgentId(Number(tokenId)),
  });
  return NextResponse.json(file, {
    headers: { "cache-control": "public, max-age=60" },
  });
}
