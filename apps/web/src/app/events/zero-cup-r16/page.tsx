"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ZERO_CUP_R16,
  ZERO_CUP_SETTLED,
  ZERO_CUP_R32_EVENT_ID,
} from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { RadialBracket } from "@/components/bracket/RadialBracket";
import { MatchupPanel } from "@/components/bracket/MatchupPanel";
import { CommitBar } from "@/components/bracket/CommitBar";
import { R16_DEF, type Round } from "@/lib/bracket-data";
import { useBracketState } from "@/lib/bracket-state";
import { useZeroCupTakes } from "@/lib/useZeroCupTakes";

// The 8 survivors, plus the Quarter-finals, are settled — everything from the
// live Semi-finals inward is what a visitor predicts.
const SETTLED_ROUNDS: Round[] = ["R16", "QF"];
const PREDICT_NODES = R16_DEF.nodes.filter(
  (n) => !SETTLED_ROUNDS.includes(n.round),
);
// Land on Heckle's settled R16 win (beat AURA) — Apps bracket, R16 #8.
const HECKLE_R16_ID = "R16_8";

export default function ZeroCupR16Page() {
  const eventId = ZERO_CUP_R32_EVENT_ID;
  const { byMatchup } = useZeroCupTakes(eventId);
  // Seed the settled R16 + Quarter-final winners (locked) so the survivors show
  // their results and advance into the live Semi-final ring.
  const state = useBracketState(eventId, R16_DEF, ZERO_CUP_SETTLED);
  const [selectedId, setSelectedId] = useState<string>(HECKLE_R16_ID);

  const innerPicked = PREDICT_NODES.filter((n) => state.picks[n.id]).length;
  const canCommit = Boolean(state.champion);

  const countryOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const mu of ZERO_CUP_R16.matchups) {
      m.set(mu.a.name, mu.a.country);
      m.set(mu.b.name, mu.b.country);
    }
    return m;
  }, []);

  const selectedNode = R16_DEF.byId.get(selectedId) ?? null;
  const selectedTakes = selectedNode
    ? byMatchup.get(selectedNode.matchupId ?? selectedNode.id) ?? []
    : [];

  const roundSiblings = selectedNode
    ? R16_DEF.nodes.filter((n) => n.round === selectedNode.round)
    : [];
  const canNavigate = roundSiblings.length > 1;

  function navigate(dir: -1 | 1) {
    if (roundSiblings.length === 0) return;
    const idx = roundSiblings.findIndex((n) => n.id === selectedId);
    const base = idx === -1 ? 0 : idx;
    const next = (base + dir + roundSiblings.length) % roundSiblings.length;
    setSelectedId(roundSiblings[next].id);
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
          <Pill tone="filled">R16 settled · Jul 4–8</Pill>
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          {ZERO_CUP_R16.title}
        </h1>
        <p className="font-body text-lg opacity-80 max-w-prose">
          The 8 survivors, on their own radial canvas — the Round of 16 and the
          Quarter-finals are settled. Tap any matchup to inspect the result and
          the hecklers&rsquo; calls (each a TEE-attested take, stored on 0G and
          committed on-chain before the result), then predict the live
          Semi-finals inward. Heckle beat AURA here, then Turing&nbsp;Pits in the
          Quarter-finals, and is now in the Top&nbsp;4.
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
            Full 32-entrant board
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
          canNavigate={canNavigate}
          locked={selectedNode ? SETTLED_ROUNDS.includes(selectedNode.round) : false}
          takes={selectedTakes}
        />
      </div>

      <CommitBar
        eventId={eventId}
        predictionSet={state.predictionSet}
        picked={innerPicked}
        totalCount={PREDICT_NODES.length}
        roundLabel="predictions"
        canCommit={canCommit}
        champion={state.champion}
        onClear={state.clear}
      />
    </div>
  );
}
