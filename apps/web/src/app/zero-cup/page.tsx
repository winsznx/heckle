"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ZERO_CUP_R32, ZERO_CUP_R32_EVENT_ID } from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { RadialBracket } from "@/components/bracket/RadialBracket";
import { MatchupPanel } from "@/components/bracket/MatchupPanel";
import { CommitBar } from "@/components/bracket/CommitBar";
import { R32_DEF } from "@/lib/bracket-data";
import { useBracketState } from "@/lib/bracket-state";
import { useZeroCupTakes } from "@/lib/useZeroCupTakes";

export default function ZeroCupBracketPage() {
  const eventId = ZERO_CUP_R32_EVENT_ID;
  const { byMatchup } = useZeroCupTakes(eventId);
  const state = useBracketState(eventId, R32_DEF);
  const [selectedId, setSelectedId] = useState<string>("R32_1");

  const countryOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const mu of ZERO_CUP_R32.matchups) {
      m.set(mu.a.name, mu.a.country);
      m.set(mu.b.name, mu.b.country);
    }
    return m;
  }, []);

  const selectedNode = R32_DEF.byId.get(selectedId) ?? null;
  const selectedTakes = selectedNode?.matchupId
    ? byMatchup.get(selectedNode.matchupId) ?? []
    : [];

  function navigate(dir: -1 | 1) {
    const outer = R32_DEF.outerNodes;
    const idx = outer.findIndex((n) => n.id === selectedId);
    const base = idx === -1 ? 0 : idx;
    const next = (base + dir + outer.length) % outer.length;
    setSelectedId(outer[next].id);
  }

  if (eventId === null) {
    return (
      <Card className="p-8">
        <p className="font-display text-xl">Registering on-chain, back shortly.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="filled">Live — build until Jul 3</Pill>
          <span className="font-mono text-xs uppercase opacity-60">
            Event #{eventId}
          </span>
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          Zero Cup bracket
        </h1>
        <p className="font-body text-lg opacity-80 max-w-prose">
          32 builders, one radial bracket. Tap a matchup to hear all three
          hecklers&rsquo; verified calls, pick your winners, and commit your full
          bracket on-chain.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/events/zero-cup-r32"
            className="inline-flex items-center gap-2 border border-rule bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide hover:bg-whisper transition-colors"
          >
            Grid view
          </Link>
          <span className="font-mono text-xs opacity-50">
            Prefer a list? The grid is mobile-friendly.
          </span>
        </div>
      </header>

      <Divider />

      <RadialBracket
        def={R32_DEF}
        picks={state.picks}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onPick={state.pick}
        takeCount={(id) => byMatchup.get(id)?.length ?? 0}
      />

      <div className="mx-auto w-full max-w-prose">
        <MatchupPanel
          node={selectedNode}
          contestants={state.contestants(selectedId)}
          countryOf={(name) => countryOf.get(name) ?? ""}
          chosen={selectedNode ? state.picks[selectedNode.id] : undefined}
          onPick={state.pick}
          onNavigate={navigate}
          takes={selectedTakes}
        />
      </div>

      <CommitBar
        eventId={eventId}
        predictionSet={state.predictionSet}
        picked={state.outerCount}
        totalCount={R32_DEF.outerCount}
        roundLabel="R32"
        canCommit={state.canCommit}
        champion={state.champion}
        onClear={state.clear}
      />
    </div>
  );
}
