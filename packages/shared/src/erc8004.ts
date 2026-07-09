import { ZG_MAINNET_ID } from "./chains";
import { ERC8004_ADDRESSES } from "./addresses";

/**
 * ERC-8004 "Trustless Agents" registration for Heckle characters. The registry
 * (an ERC-721 in its own tokenId space) issues an `agentId`; its registration
 * file points at the character's ERC-7857 identity (INFT contract + tokenId), so
 * the badge tracks the FINAL migrated identity, not the legacy V1 token.
 */

/** tokenId (character) -> agentId (ERC-8004), registered on 0G's IdentityRegistry. */
export const ERC8004_AGENTS: Record<number, number> = {
  0: 1400427, // The Pundit
  3: 1400450, // The Hater
  4: 1400456, // The Optimist
  5: 1405225, // The Homer
  6: 1405240, // The Firebrand
  7: 1405259, // The Contrarian
};

export function erc8004AgentId(tokenId: number): number | undefined {
  return ERC8004_AGENTS[tokenId];
}

/** CAIP-style registry ref, e.g. eip155:16661:0x8004A169… */
export function erc8004RegistryRef(): string {
  return `eip155:${ZG_MAINNET_ID}:${ERC8004_ADDRESSES.identity}`;
}

export interface Erc8004FileParams {
  name: string;
  description: string;
  image: string;
  webEndpoint: string;
  inftContract: string;
  tokenId: number;
  agentId?: number;
}

/** Build the ERC-8004 registration file (the JSON an agentURI must resolve to). */
export function buildErc8004RegistrationFile(p: Erc8004FileParams): Record<string, unknown> {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: p.name,
    description: p.description,
    image: p.image,
    services: [
      { name: "web", endpoint: p.webEndpoint },
      // Points at the character's ERC-7857 identity (contract/tokenId).
      { name: "0g-agentic-id", endpoint: `eip155:${ZG_MAINNET_ID}:${p.inftContract}/${p.tokenId}` },
    ],
    x402Support: false,
    active: true,
    registrations:
      p.agentId !== undefined
        ? [{ agentId: p.agentId, agentRegistry: erc8004RegistryRef() }]
        : [],
    supportedTrust: ["reputation"],
  };
}
