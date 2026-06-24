import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";
import type { Signer } from "ethers";
import { storageUri } from "@heckle/shared";
import { env } from "./env.js";

let indexer: Indexer | null = null;

function getIndexer(): Indexer {
  if (!indexer) {
    indexer = new Indexer(env.ZG_STORAGE_INDEXER);
  }
  return indexer;
}

export interface UploadResult {
  /** 0G Storage Merkle root (0x-prefixed, 32-byte hex — usable as bytes32). */
  root: string;
  /** Retrievable gateway URL for the root. */
  uri: string;
  /** On-chain submission tx hash, when the upload created a new entry. */
  tx?: string;
}

/**
 * Upload a JSON-serializable object to 0G Storage and return its Merkle root.
 * Throws on any SDK error — there are no mock roots.
 */
export async function uploadJson(
  signer: Signer,
  obj: unknown,
): Promise<UploadResult> {
  const payload = Buffer.from(JSON.stringify(obj));
  const data = new MemData(payload);

  const [tree, treeErr] = await data.merkleTree();
  if (treeErr) throw treeErr;
  const root = tree?.rootHash();
  if (!root) throw new Error("0G Storage: failed to compute Merkle root");

  const [result, uploadErr] = await getIndexer().upload(
    data,
    env.ZG_RPC_URL,
    signer,
  );
  if (uploadErr) throw uploadErr;
  if (!result) throw new Error("0G Storage: upload returned no result");

  const tx = "txHash" in result ? result.txHash : result.txHashes[0];

  return { root, uri: storageUri(root), tx };
}

/**
 * Download a JSON blob from 0G Storage by Merkle root and parse it.
 * Throws on SDK or parse errors.
 */
export async function downloadJson(root: string): Promise<unknown> {
  const [blob, err] = await getIndexer().downloadToBlob(root);
  if (err) throw err;
  if (!blob) throw new Error(`0G Storage: empty download for root ${root}`);

  const text = await blob.text();
  return JSON.parse(text);
}
