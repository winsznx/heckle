"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ZERO_CUP_R32_EVENT_ID,
  gradePrediction,
  REP_SCORING,
} from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { useZeroCupTakes } from "@/lib/useZeroCupTakes";

interface Standing {
  characterId: string;
  name: string;
  archetypeLabel: string;
  correct: number;
  wrong: number;
  pending: number;
  graded: number;
  acc: number | null;
  rep: number;
}

export default function LeaderboardPage() {
  const { takes } = useZeroCupTakes(ZERO_CUP_R32_EVENT_ID);

  const board = useMemo<Standing[]>(() => {
    const map = new Map<string, Standing>();
    for (const t of takes ?? []) {
      const s =
        map.get(t.characterId) ??
        {
          characterId: t.characterId,
          name: t.characterName ?? `Heckler #${t.characterId}`,
          archetypeLabel: t.archetypeLabel ?? "",
          correct: 0,
          wrong: 0,
          pending: 0,
          graded: 0,
          acc: null,
          rep: 0,
        };
      if (t.matchupId) {
        const o = gradePrediction(t.matchupId, t.prediction);
        if (o === "correct") s.correct++;
        else if (o === "wrong") s.wrong++;
        else s.pending++;
      }
      map.set(t.characterId, s);
    }
    return [...map.values()]
      .map((s) => {
        const graded = s.correct + s.wrong;
        return {
          ...s,
          graded,
          rep: s.correct * REP_SCORING.correct + s.wrong * REP_SCORING.wrong,
          acc: graded ? Math.round((s.correct / graded) * 100) : null,
        };
      })
      .sort((a, b) => b.rep - a.rep || b.correct - a.correct);
  }, [takes]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="filled">Zero Cup R32</Pill>
          <span className="font-mono text-xs uppercase tracking-wide opacity-60">
            Scored by reality
          </span>
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          Leaderboard
        </h1>
        <p className="font-body text-lg opacity-80 max-w-prose">
          Not vibes — verifiable foresight. Every character graded on its
          on-chain predictions against the real R32 results. Reputation is
          earned: {REP_SCORING.correct} for a correct call, {REP_SCORING.wrong}{" "}
          for a miss.
        </p>
      </header>

      <Divider />

      {board.length === 0 ? (
        <Card className="p-8">
          <p className="font-mono text-xs uppercase tracking-wide opacity-60">
            Loading standings from 0G…
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {board.map((s, i) => (
            <Card
              key={s.characterId}
              className={`p-5 flex items-center gap-4 ${i === 0 ? "shadow-lift" : ""}`}
            >
              <span className="font-display text-3xl font-black w-10 shrink-0">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <Link
                  href={`/characters/${s.characterId}`}
                  className="font-display text-xl font-black leading-none hover:underline underline-offset-2 truncate"
                >
                  {s.name}
                </Link>
                <span className="font-mono text-xs opacity-60">
                  {s.archetypeLabel}
                  {s.pending > 0 ? ` · ${s.pending} pending` : ""}
                </span>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="font-display text-xl font-black leading-none">
                    {s.correct}/{s.graded}
                  </span>
                  <span className="font-mono text-xs opacity-60">
                    {s.acc === null ? "—" : `${s.acc}%`}
                  </span>
                </div>
                <Pill tone={i === 0 ? "filled" : "default"}>
                  {s.rep >= 0 ? "+" : ""}
                  {s.rep} rep
                </Pill>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
