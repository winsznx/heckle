"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ZERO_CUP_R32,
  ZERO_CUP_R32_EVENT_ID,
  ZERO_CUP_SETTLED,
} from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { RadialBracket } from "@/components/bracket/RadialBracket";
import { MatchupPanel } from "@/components/bracket/MatchupPanel";
import { CommitBar } from "@/components/bracket/CommitBar";
import { RoadToTheCup } from "@/components/RoadToTheCup";
import { HashLink } from "@/components/HashLink";
import { R32_DEF, type Round } from "@/lib/bracket-data";
import { useBracketState } from "@/lib/bracket-state";
import { useZeroCupTakes } from "@/lib/useZeroCupTakes";

// R32 and R16 are settled — their winners seed onto the board and lock. What a
// visitor predicts is everything from the live Quarter-finals inward.
const SETTLED_ROUNDS: Round[] = ["R32", "R16"];
const PREDICT_NODES = R32_DEF.nodes.filter(
  (n) => !SETTLED_ROUNDS.includes(n.round),
);
// Land on Heckle's live matchup — QF4, Apps bracket: Turing Pits vs Heckle.
const HECKLE_QF_ID = "QF_4";

export default function ZeroCupBracketPage() {
  const eventId = ZERO_CUP_R32_EVENT_ID;
  const { byMatchup } = useZeroCupTakes(eventId);
  // Seed the settled R32 + R16 winners (locked) so they're already advanced
  // inward on the full 32-entrant board — nothing is removed; teams move ring by
  // ring as each round resolves, so the live Quarter-finals show the real four.
  const state = useBracketState(eventId, R32_DEF, ZERO_CUP_SETTLED);
  const [selectedId, setSelectedId] = useState<string>(HECKLE_QF_ID);

  const innerPicked = PREDICT_NODES.filter((n) => state.picks[n.id]).length;
  const canCommit = Boolean(state.champion);

  const countryOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const mu of ZERO_CUP_R32.matchups) {
      m.set(mu.a.name, mu.a.country);
      m.set(mu.b.name, mu.b.country);
    }
    return m;
  }, []);

  const selectedNode = R32_DEF.byId.get(selectedId) ?? null;
  // Inner nodes have no matchupId but their id ("R16_1"…) is the takes key.
  const selectedTakes = selectedNode
    ? byMatchup.get(selectedNode.matchupId ?? selectedNode.id) ?? []
    : [];

  // Cycle within the selected node's own round (flip through the four live QFs,
  // or across all sixteen R32 fixtures when inspecting an old round).
  const roundSiblings = selectedNode
    ? R32_DEF.nodes.filter((n) => n.round === selectedNode.round)
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
          <Pill tone="filled">R16 settled · Quarter-finals live</Pill>
          <span className="font-mono text-xs uppercase opacity-60">
            Event #{eventId}
          </span>
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          Zero Cup bracket
        </h1>
        <p className="font-body text-lg opacity-80 max-w-prose">
          The full 32-entrant board. R32 and the Round of 16 are settled — their
          winners have advanced inward, and nothing leaves the bracket: teams move
          ring by ring as each round resolves. Heckle came through the Apps bracket
          to the Quarter-finals — it&rsquo;s Turing&nbsp;Pits vs Heckle in QF4. Tap
          any matchup for the hecklers&rsquo; verified calls, then predict the live
          Quarter-finals through to the champion.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/events/zero-cup-r16"
            className="inline-flex items-center gap-2 border border-rule bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide hover:bg-whisper transition-colors"
          >
            R16 grid
          </Link>
          <Link
            href="/events/zero-cup-r32"
            className="inline-flex items-center gap-2 border border-rule bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide hover:bg-whisper transition-colors"
          >
            R32 grid
          </Link>
          <span className="font-mono text-xs opacity-50">
            Inspect any settled round as a mobile-friendly grid.
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

      <div className="flex justify-center">
        <HashLink
          type="storage_root"
          value="0x8251ae4e8a02cc8f0d6f666b1b59c5f4b36c804a34532049d1f21c9d86620b67"
          label="The trophy itself is on 0G Storage ·"
        />
      </div>

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

      <div className="pt-8">
        <RoadToTheCup />
      </div>
    </div>
  );
}
