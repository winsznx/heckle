export type Hex = `0x${string}`;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Hex;

/**
 * Deployed Heckle contract addresses. Filled from env after Phase 2 deploy.
 * NEXT_PUBLIC_* are inlined by Next at build for client reads; the agent reads
 * the same names from its own env.
 */
export const HECKLE_ADDRESSES = {
  characters: (process.env.NEXT_PUBLIC_HECKLE_CHARACTERS as Hex) || ZERO_ADDRESS,
  events: (process.env.NEXT_PUBLIC_HECKLE_EVENTS as Hex) || ZERO_ADDRESS,
  takes: (process.env.NEXT_PUBLIC_HECKLE_TAKES as Hex) || ZERO_ADDRESS,
} as const;

export function isConfigured(addr: Hex): boolean {
  return addr !== ZERO_ADDRESS;
}
