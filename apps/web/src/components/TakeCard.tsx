import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { HashLink } from "@/components/HashLink";
import { formatTs } from "@/lib/format";

const KIND_LABELS = ["Reaction", "Prediction", "Debate"] as const;

interface TakeCardProps {
  text: string | null;
  kind: number;
  timestamp: bigint;
  takeRoot: string;
  /** Commit tx hash → chainscan. */
  txHash?: string;
  /** Attestation valid flag. undefined = unknown (no badge). */
  verified?: boolean;
  triggerLabel?: string;
  characterId?: string;
  characterName?: string;
  archetypeLabel?: string;
}

export function TakeCard({
  text,
  kind,
  timestamp,
  takeRoot,
  txHash,
  verified,
  triggerLabel,
  characterId,
  characterName,
  archetypeLabel,
}: TakeCardProps) {
  const kindLabel = KIND_LABELS[kind] ?? "Take";
  const who = characterName
    ? `${characterName}${archetypeLabel ? ` · ${archetypeLabel}` : ""}`
    : characterId
      ? `Heckler #${characterId}`
      : null;

  return (
    <div className="border border-rule bg-paper shadow-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Pill>{kindLabel}</Pill>
          {who && characterId ? (
            <Link
              href={`/characters/${characterId}`}
              className="font-mono text-xs underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              {who}
            </Link>
          ) : who ? (
            <span className="font-mono text-xs opacity-70">{who}</span>
          ) : triggerLabel ? (
            <span className="font-mono text-xs opacity-60">{triggerLabel}</span>
          ) : null}
        </div>
        <span className="font-mono text-xs opacity-60 shrink-0">
          {formatTs(timestamp)}
        </span>
      </div>

      {text ? (
        <blockquote className="font-display text-xl font-black leading-tight">
          &ldquo;{text}&rdquo;
        </blockquote>
      ) : (
        <p className="font-mono text-xs opacity-50">
          Take content unavailable from storage.
        </p>
      )}

      <Divider />

      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-wide opacity-40">
          Receipt
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <HashLink type="storage_root" value={takeRoot} label="Stored" />
          {txHash ? (
            <HashLink type="tx_hash" value={txHash} label="Committed" />
          ) : null}
          {verified === undefined ? null : verified ? (
            <Pill tone="filled">Verified ✓</Pill>
          ) : (
            <Pill>Verification pending</Pill>
          )}
        </div>
      </div>
    </div>
  );
}
