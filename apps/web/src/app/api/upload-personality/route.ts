import { NextResponse } from "next/server";
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import { storageUri } from "@heckle/shared";

export const runtime = "nodejs";

interface PersonalityPayload {
  name: string;
  handle: string;
  archetype: string;
  personalityBrief: string;
  palette: number;
  createdAt: number;
  creator: string;
  imageRoot?: string;
}

function isPersonalityPayload(value: unknown): value is PersonalityPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.handle === "string" &&
    typeof v.archetype === "string" &&
    typeof v.personalityBrief === "string" &&
    typeof v.palette === "number" &&
    typeof v.createdAt === "number" &&
    typeof v.creator === "string" &&
    (v.imageRoot === undefined || typeof v.imageRoot === "string")
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const rpcUrl = process.env.ZG_RPC_URL;
  const indexerUrl = process.env.ZG_STORAGE_INDEXER;
  const agentKey = process.env.AGENT_PRIVATE_KEY;

  if (!rpcUrl || !indexerUrl || !agentKey) {
    return NextResponse.json(
      {
        error:
          "Server not configured for 0G Storage. Missing ZG_RPC_URL, ZG_STORAGE_INDEXER, or AGENT_PRIVATE_KEY.",
      },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isPersonalityPayload(payload)) {
    return NextResponse.json(
      { error: "Malformed personality payload." },
      { status: 400 },
    );
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const signer = new Wallet(agentKey, provider);
    const indexer = new Indexer(indexerUrl);

    const data = new MemData(Buffer.from(JSON.stringify(payload)));

    const [tree, treeErr] = await data.merkleTree();
    if (treeErr || !tree) {
      return NextResponse.json(
        { error: `Failed to compute merkle tree: ${treeErr?.message ?? "unknown"}` },
        { status: 500 },
      );
    }

    const root = tree.rootHash();
    if (!root) {
      return NextResponse.json(
        { error: "Failed to derive storage root." },
        { status: 500 },
      );
    }

    const [, uploadErr] = await indexer.upload(data, rpcUrl, signer);
    if (uploadErr) {
      return NextResponse.json(
        { error: `0G Storage upload failed: ${uploadErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ root, uri: storageUri(root) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown storage error.";
    return NextResponse.json(
      { error: `0G Storage error: ${message}` },
      { status: 500 },
    );
  }
}
