"use client";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { TakeCard } from "@/components/TakeCard";
import { flagEmoji } from "@/lib/format";
import type { BracketNode, Round } from "@/lib/bracket-data";
import type { MatchTake } from "@/lib/useZeroCupTakes";

const ROUND_TITLE: Record<Round, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  Final: "Final",
};

interface MatchupPanelProps {
  node: BracketNode | null;
  contestants: [string | null, string | null];
  countryOf: (name: string) => string;
  chosen: string | undefined;
  onPick: (nodeId: string, winner: string) => void;
  onNavigate: (dir: -1 | 1) => void;
  /** Whether the selected node's round has siblings to flip between. */
  canNavigate: boolean;
  /** Settled round — `chosen` is the locked tournament result, not a user pick. */
  locked?: boolean;
  takes: MatchTake[];
}

export function MatchupPanel({
  node,
  contestants,
  countryOf,
  chosen,
  onPick,
  onNavigate,
  canNavigate,
  locked = false,
  takes,
}: MatchupPanelProps) {
  if (!node) {
    return (
      <Card className="p-6 flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-wide opacity-50">
          Matchup
        </span>
        <p className="font-body opacity-70">
          Tap any matchup on the bracket to see the hecklers&rsquo; calls and pick
          your winner.
        </p>
      </Card>
    );
  }

  const [a, b] = contestants;
  const isR32 = Boolean(node.matchupId);
  const aVotes = a
    ? takes.filter((t) => t.prediction?.toLowerCase().includes(a.toLowerCase())).length
    : 0;
  const bVotes = b
    ? takes.filter((t) => t.prediction?.toLowerCase().includes(b.toLowerCase())).length
    : 0;

  const pickButton = (name: string | null, votes: number) => {
    if (!name) {
      return (
        <div className="flex-1 border border-rule bg-whisper px-3 py-3 flex flex-col gap-1 opacity-60">
          <span className="font-mono text-xs uppercase tracking-wide">TBD</span>
          <span className="font-mono text-xs">Decide the feeding round first</span>
        </div>
      );
    }
    const isWinner = chosen === name;
    const status = locked
      ? isWinner
        ? "Advanced ✓"
        : "Eliminated"
      : isWinner
        ? "Your pick ✓"
        : "Pick to advance";
    const highlight = isWinner ? "bg-ink text-paper" : "bg-paper";
    return (
      <button
        type="button"
        onClick={() => onPick(node.id, name)}
        disabled={locked}
        aria-disabled={locked}
        className={`flex-1 border border-rule px-3 py-3 flex flex-col gap-1 text-left transition-colors ${highlight} ${
          locked
            ? isWinner
              ? "cursor-default"
              : "cursor-default opacity-50"
            : isWinner
              ? ""
              : "hover:bg-whisper"
        }`}
      >
        <span className="font-display text-lg font-black leading-none">
          {flagEmoji(countryOf(name))} {name}
        </span>
        <span className="font-mono text-xs opacity-70">
          {status}
          {takes.length > 0 ? ` · ${votes} heckler${votes === 1 ? "" : "s"}` : ""}
        </span>
      </button>
    );
  };

  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="filled">{ROUND_TITLE[node.round]}</Pill>
          <span className="font-mono text-xs uppercase tracking-wide opacity-50">
            {node.bracket}
          </span>
          {locked ? (
            <span className="font-mono text-xs uppercase tracking-wide opacity-50">
              · settled
            </span>
          ) : null}
          {isR32 ? (
            <span className="font-mono text-xs opacity-50">{node.label}</span>
          ) : null}
        </div>
        {canNavigate ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Previous matchup"
              onClick={() => onNavigate(-1)}
              className="border border-rule px-2 py-1 font-mono text-xs hover:bg-whisper transition-colors"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next matchup"
              onClick={() => onNavigate(1)}
              className="border border-rule px-2 py-1 font-mono text-xs hover:bg-whisper transition-colors"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {pickButton(a, aVotes)}
        {pickButton(b, bVotes)}
      </div>

      {a && b ? (
        <>
          <Divider />
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wide opacity-50">
              Heckler calls
            </span>
            {takes.length > 0 ? (
              <span className="font-mono text-xs opacity-60">
                {aVotes}–{bVotes}
              </span>
            ) : null}
          </div>
          {takes.length === 0 ? (
            <p className="font-mono text-xs opacity-50">
              No verified takes for this matchup yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {takes.map((t) => (
                <TakeCard
                  key={t.takeId}
                  text={t.text}
                  kind={t.kind}
                  timestamp={t.timestamp}
                  takeRoot={t.takeRoot}
                  txHash={t.txHash}
                  verified={t.verified}
                  contractVerified={t.contractVerified}
                  characterId={t.characterId}
                  characterName={t.characterName}
                  archetypeLabel={t.archetypeLabel}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </Card>
  );
}
