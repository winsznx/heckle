import { NextResponse } from "next/server";
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import { storageUri } from "@heckle/shared";

export const runtime = "nodejs";

interface BracketPick {
  matchupId: string;
  winner: string;
}

interface BracketPayload {
  kind: "BracketPredictionSet";
  eventId: number;
  submitter: string;
  picks: BracketPick[];
  createdAt: number;
}

function isBracketPayload(value: unknown): value is BracketPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (
    v.kind !== "BracketPredictionSet" ||
    typeof v.eventId !== "number" ||
    typeof v.submitter !== "string" ||
    typeof v.createdAt !== "number" ||
    !Array.isArray(v.picks)
  ) {
    return false;
  }
  return v.picks.every(
    (p) =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as Record<string, unknown>).matchupId === "string" &&
      typeof (p as Record<string, unknown>).winner === "string",
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

  if (!isBracketPayload(payload)) {
    return NextResponse.json(
      { error: "Malformed bracket payload." },
      { status: 400 },
    );
  }

  if (payload.picks.length === 0) {
    return NextResponse.json(
      { error: "Bracket has no picks." },
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
