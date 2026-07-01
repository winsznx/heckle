import { ZG_EXPLORER } from "@heckle/shared";
import { truncateAddr } from "@/lib/format";
import { IconExternal, IconStorage } from "@/components/ui/icons";

export type HashType = "storage_root" | "tx_hash" | "block_hash" | "address";

function hrefFor(type: HashType, value: string): string {
  switch (type) {
    case "storage_root":
      return `/storage/${value}`;
    case "tx_hash":
      return `${ZG_EXPLORER}/tx/${value}`;
    case "block_hash":
      return `${ZG_EXPLORER}/block/${value}`;
    case "address":
      return `${ZG_EXPLORER}/address/${value}`;
  }
}

interface HashLinkProps {
  type: HashType;
  value: string;
  /** Optional prefix label, e.g. "Stored", "Committed", "Owner". */
  label?: string;
  className?: string;
  lead?: number;
  tail?: number;
}

/**
 * Routes a 0x hash to the correct destination by type — never the raw Storage
 * gateway (which downloads). storage_root → internal /storage/[root] viewer;
 * everything else → chainscan. All open in a new tab.
 */
export function HashLink({
  type,
  value,
  label,
  className,
  lead = 8,
  tail = 6,
}: HashLinkProps) {
  const internal = type === "storage_root";
  const Icon = internal ? IconStorage : IconExternal;

  return (
    <a
      href={hrefFor(type, value)}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center gap-1 font-mono text-xs opacity-60 hover:opacity-100 transition-opacity"
      }
    >
      {label ? <span>{label}</span> : null}
      <span>{truncateAddr(value, lead, tail)}</span>
      <Icon />
    </a>
  );
}
