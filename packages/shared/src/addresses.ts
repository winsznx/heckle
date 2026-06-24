export type Hex = `0x${string}`;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Hex;

/**
 * Live Heckle deployment on 0G mainnet (chainId 16661). These are the baked-in
 * defaults so a fresh clone points at the real contracts with no env required;
 * override per-environment with NEXT_PUBLIC_HECKLE_* if you redeploy.
 */
export const DEPLOYED_ADDRESSES = {
  characters: "0xfFB4A91Ff9C8dD16d9b0e0665d869392C8fCC0bc" as Hex,
  events: "0x30F9cF192A93C817d152606225a9C3DEC1d1B616" as Hex,
  takes: "0x06c2d42c2fA90897138ddeBa9f2Bc6CcF064d2BD" as Hex,
} as const;

export const HECKLE_ADDRESSES = {
  characters: (process.env.NEXT_PUBLIC_HECKLE_CHARACTERS as Hex) || DEPLOYED_ADDRESSES.characters,
  events: (process.env.NEXT_PUBLIC_HECKLE_EVENTS as Hex) || DEPLOYED_ADDRESSES.events,
  takes: (process.env.NEXT_PUBLIC_HECKLE_TAKES as Hex) || DEPLOYED_ADDRESSES.takes,
} as const;

export function isConfigured(addr: Hex): boolean {
  return addr !== ZERO_ADDRESS;
}
