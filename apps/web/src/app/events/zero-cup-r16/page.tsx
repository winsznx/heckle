"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ZERO_CUP_R16, ZERO_CUP_R32_EVENT_ID } from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { RadialBracket } from "@/components/bracket/RadialBracket";
import { MatchupPanel } from "@/components/bracket/MatchupPanel";
import { CommitBar } from "@/components/bracket/CommitBar";
import { R16_DEF } from "@/lib/bracket-data";
import { useBracketState } from "@/lib/bracket-state";
import { useZeroCupTakes } from "@/lib/useZeroCupTakes";

export default function ZeroCupR16Page() {
  const eventId = ZERO_CUP_R32_EVENT_ID;
  const { byMatchup } = useZeroCupTakes(eventId);
  const state = useBracketState(eventId, R16_DEF);
  const [selectedId, setSelectedId] = useState<string>("R16_1");

  const countryOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const mu of ZERO_CUP_R16.matchups) {
      m.set(mu.a.name, mu.a.country);
      m.set(mu.b.name, mu.b.country);
    }
    return m;
  }, []);

  const selectedNode = R16_DEF.byId.get(selectedId) ?? null;
  const selectedTakes = selectedNode?.matchupId
    ? byMatchup.get(selectedNode.matchupId) ?? []
    : [];

  function navigate(dir: -1 | 1) {
    const outer = R16_DEF.outerNodes;
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
          <Pill tone="filled">Live — R16 · Jul 4</Pill>
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          {ZERO_CUP_R16.title}
        </h1>
        <p className="font-body text-lg opacity-80 max-w-prose">
          The 16 survivors, on the same radial canvas. Tap any matchup to hear the
          three hecklers&rsquo; calls — each a TEE-attested take, stored on 0G and
          committed on-chain before the result — and build your own R16 bracket.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/proof"
            className="inline-flex items-center gap-2 border border-rule bg-ink text-paper px-4 py-2 font-mono text-xs uppercase tracking-wide shadow-lift hover:-translate-y-px transition-transform"
          >
            What makes a take real? →
          </Link>
          <Link
            href="/zero-cup"
            className="inline-flex items-center gap-2 border border-rule bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide hover:bg-whisper transition-colors"
          >
            R32 bracket
          </Link>
        </div>
      </header>

      <Divider />

      <RadialBracket
        def={R16_DEF}
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
        totalCount={R16_DEF.outerCount}
        roundLabel="R16"
        canCommit={state.canCommit}
        champion={state.champion}
        onClear={state.clear}
      />
    </div>
  );
}
