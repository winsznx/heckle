export const ZG_RPC_URL = "https://evmrpc.0g.ai";
export const ZG_STORAGE_INDEXER = "https://indexer-storage-turbo.0g.ai";
export const ZG_EXPLORER = "https://chainscan.0g.ai";

/** Build a chainscan link for an address or tx hash. */
export function explorerAddress(addr: string): string {
  return `${ZG_EXPLORER}/address/${addr}`;
}
export function explorerTx(hash: string): string {
  return `${ZG_EXPLORER}/tx/${hash}`;
}
/** A retrievable gateway URL for a 0G Storage root (download-by-root). */
export function storageUri(root: string): string {
  return `${ZG_STORAGE_INDEXER}/file?root=${root}`;
}
