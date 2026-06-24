import { storageUri } from "@heckle/shared";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { truncateAddr, formatTs } from "@/lib/format";

const KIND_LABELS = ["Reaction", "Prediction", "Debate"] as const;

interface TakeCardProps {
  text: string | null;
  kind: number;
  timestamp: bigint;
  takeRoot: string;
  triggerLabel?: string;
}

export function TakeCard({
  text,
  kind,
  timestamp,
  takeRoot,
  triggerLabel,
}: TakeCardProps) {
  const kindLabel = KIND_LABELS[kind] ?? "Take";
  return (
    <div className="border border-rule bg-paper shadow-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill>{kindLabel}</Pill>
          {triggerLabel ? (
            <span className="font-mono text-xs opacity-60">{triggerLabel}</span>
          ) : null}
        </div>
        <span className="font-mono text-xs opacity-60">
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
      <a
        href={storageUri(takeRoot)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs opacity-60 hover:opacity-100 transition-opacity"
      >
        0G Storage · {truncateAddr(takeRoot, 8, 6)}
      </a>
    </div>
  );
}
