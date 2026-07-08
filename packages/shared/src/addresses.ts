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
  brackets: "0xa1139baE1bdC2FC94A400bc8097342dB0A0f3E6B" as Hex,
  votes: "0x86D905467F90a656fE77c60e666F7B9cdC9320bB" as Hex,
  resolver: "0xE0014a5240DC8414A9684C747F8bc3E653F6e9a3" as Hex,
  attestationRegistry: "0x8e6213269b003DD6f0B01401ACE1160AF1645403" as Hex,
  verifiedTakes: "0x39c138842E89B9f5935C0B050CE2dA86F21c88dF" as Hex,
  // Real ERC-7857 layer. The flagship characters (tokenIds 0/3/4) live here;
  // user characters 1/2 stay on the V1 `characters` contract.
  inft: "0x2C6D703CE17cBBd904b6949F4814C5E2a2fF1a75" as Hex,
  dataVerifier: "0x501e6Ff1759f0d762A0F9eD353280b26212df3CC" as Hex,
} as const;

/** Character tokenIds migrated to the real ERC-7857 HeckleINFT. */
export const INFT_MIGRATED_IDS: readonly number[] = [0, 3, 4];

export function isInftMigrated(tokenId: number | string): boolean {
  return INFT_MIGRATED_IDS.includes(Number(tokenId));
}

export const HECKLE_ADDRESSES = {
  characters: (process.env.NEXT_PUBLIC_HECKLE_CHARACTERS as Hex) || DEPLOYED_ADDRESSES.characters,
  events: (process.env.NEXT_PUBLIC_HECKLE_EVENTS as Hex) || DEPLOYED_ADDRESSES.events,
  takes: (process.env.NEXT_PUBLIC_HECKLE_TAKES as Hex) || DEPLOYED_ADDRESSES.takes,
  brackets: (process.env.NEXT_PUBLIC_HECKLE_BRACKETS as Hex) || DEPLOYED_ADDRESSES.brackets,
  votes: (process.env.NEXT_PUBLIC_HECKLE_VOTES as Hex) || DEPLOYED_ADDRESSES.votes,
  resolver: (process.env.NEXT_PUBLIC_HECKLE_RESOLVER as Hex) || DEPLOYED_ADDRESSES.resolver,
  attestationRegistry:
    (process.env.NEXT_PUBLIC_HECKLE_ATTESTATION_REGISTRY as Hex) ||
    DEPLOYED_ADDRESSES.attestationRegistry,
  verifiedTakes:
    (process.env.NEXT_PUBLIC_HECKLE_VERIFIED_TAKES as Hex) || DEPLOYED_ADDRESSES.verifiedTakes,
  inft: (process.env.NEXT_PUBLIC_HECKLE_INFT as Hex) || DEPLOYED_ADDRESSES.inft,
  dataVerifier:
    (process.env.NEXT_PUBLIC_HECKLE_DATA_VERIFIER as Hex) || DEPLOYED_ADDRESSES.dataVerifier,
} as const;

/**
 * Canonical ERC-8004 "Trustless Agents" registries — deployed at the same
 * CREATE2 vanity address on every chain, including 0G mainnet (verified live via
 * eth_getCode). We register Heckle characters here so they're discoverable in
 * the broader agent ecosystem; the registration file points at the character's
 * ERC-7857 identity (contract + tokenId).
 */
export const ERC8004_ADDRESSES = {
  identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Hex,
  reputation: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Hex,
} as const;

export function isConfigured(addr: Hex): boolean {
  return addr !== ZERO_ADDRESS;
}
