import { erc8004AgentId, ERC8004_ADDRESSES } from "@heckle/shared";
import { Pill } from "@/components/ui/Pill";

/**
 * "Registered agent · ERC-8004" badge. Renders only once the character has been
 * registered on 0G's live IdentityRegistry (i.e. ERC8004_AGENTS has its agentId,
 * populated after the ERC-7857 migration) — so it never claims a registration
 * that isn't on-chain, and always points at the final ERC-7857 identity.
 */
export function Erc8004Badge({ tokenId }: { tokenId: number }) {
  const agentId = erc8004AgentId(tokenId);
  if (agentId === undefined) return null;

  return (
    <a
      href={`https://chainscan.0g.ai/address/${ERC8004_ADDRESSES.identity}`}
      target="_blank"
      rel="noreferrer"
      title="Registered on the ERC-8004 Trustless Agents IdentityRegistry (0G mainnet)"
      className="inline-flex hover:-translate-y-px transition-transform"
    >
      <Pill tone="filled">ERC-8004 agent #{agentId} ↗</Pill>
    </a>
  );
}
