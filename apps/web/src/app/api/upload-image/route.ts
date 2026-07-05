import { NextResponse } from "next/server";
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import { storageUri } from "@heckle/shared";

export const runtime = "nodejs";

// The image is served back from the 0G gateway (not a fast CDN), so keep it
// small — the client downscales before upload; this is the server-side backstop.
const MAX_BYTES = 300 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/avif"];

// This endpoint spends the agent's 0G on every stored image, so cap the rate at
// the process level — enough headroom for real Create flows, a wall against spam
// meant to drain funds. (Persistent Node server → this state actually holds.)
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
let hits: number[] = [];

// base64 inflates ~1.37x; 300KB image → ~410KB body. Reject bigger bodies before
// buffering so an oversized POST can't be read into memory at all.
const MAX_BODY_BYTES = 600 * 1024;

/** Confirm the decoded bytes actually start with the claimed image's magic bytes. */
function sniffImage(bytes: Buffer, mime: string): boolean {
  if (mime === "image/png") return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/webp") return bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (mime === "image/avif") return bytes.length > 12 && bytes.toString("ascii", 4, 8) === "ftyp" && bytes.toString("ascii", 8, 12).startsWith("avi");
  return false;
}

export async function POST(request: Request): Promise<NextResponse> {
  const rpcUrl = process.env.ZG_RPC_URL;
  const indexerUrl = process.env.ZG_STORAGE_INDEXER;
  const agentKey = process.env.AGENT_PRIVATE_KEY;

  if (!rpcUrl || !indexerUrl || !agentKey) {
    return NextResponse.json(
      { error: "Server not configured for 0G Storage." },
      { status: 500 },
    );
  }

  const now = Date.now();
  hits = hits.filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: "Too many uploads right now — try again in a minute." },
      { status: 429 },
    );
  }
  hits.push(now);

  const declaredLen = Number(request.headers.get("content-length") ?? 0);
  if (declaredLen > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Image too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const dataUrl = (body as { dataUrl?: unknown })?.dataUrl;
  if (typeof dataUrl !== "string") {
    return NextResponse.json({ error: "Missing image." }, { status: 400 });
  }
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json(
      { error: "Expected a base64 image data URL." },
      { status: 400 },
    );
  }
  const [, mime, b64] = match;
  if (!ALLOWED.includes(mime)) {
    return NextResponse.json(
      { error: "Unsupported image type (png, jpeg, webp, avif)." },
      { status: 400 },
    );
  }
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Empty image." }, { status: 400 });
  }
  if (bytes.length > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image too large (max ${Math.round(MAX_BYTES / 1024)}KB after downscale).` },
      { status: 400 },
    );
  }
  if (!sniffImage(bytes, mime)) {
    return NextResponse.json(
      { error: "That doesn't look like a real image." },
      { status: 400 },
    );
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const signer = new Wallet(agentKey, provider);
    const indexer = new Indexer(indexerUrl);

    const data = new MemData(bytes);
    const [tree, treeErr] = await data.merkleTree();
    if (treeErr || !tree) {
      return NextResponse.json({ error: "Failed to compute storage root." }, { status: 500 });
    }
    const root = tree.rootHash();
    if (!root) {
      return NextResponse.json({ error: "Failed to derive storage root." }, { status: 500 });
    }
    const [, uploadErr] = await indexer.upload(data, rpcUrl, signer);
    if (uploadErr) {
      console.error("[upload-image] upload", uploadErr);
      return NextResponse.json({ error: "0G Storage upload failed." }, { status: 500 });
    }
    return NextResponse.json({ root, uri: storageUri(root) });
  } catch (err) {
    console.error("[upload-image]", err);
    return NextResponse.json({ error: "0G Storage error." }, { status: 500 });
  }
}
