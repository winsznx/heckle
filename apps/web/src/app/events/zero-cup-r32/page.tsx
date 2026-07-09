"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ZERO_CUP_R32,
  ZERO_CUP_R32_EVENT_ID,
  ZERO_CUP_R32_EVENT_ROOT,
  type ZeroCupMatchup,
} from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { HashLink } from "@/components/HashLink";
import { TakeCard } from "@/components/TakeCard";
import { flagEmoji } from "@/lib/format";
import { useZeroCupTakes, type MatchTake } from "@/lib/useZeroCupTakes";

function MatchupCard({ m, takes }: { m: ZeroCupMatchup; takes: MatchTake[] }) {
  const [open, setOpen] = useState(false);
  const aVotes = takes.filter(
    (t) => t.prediction?.toLowerCase().includes(m.a.name.toLowerCase()),
  ).length;
  const bVotes = takes.filter(
    (t) => t.prediction?.toLowerCase().includes(m.b.name.toLowerCase()),
  ).length;
  const total = takes.length;

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs opacity-50">{m.label}</span>
        <span className="font-mono text-xs uppercase tracking-wide opacity-40">
          {m.bracket}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-display text-lg font-black leading-none">
          {flagEmoji(m.a.country)} {m.a.name}
        </span>
        <span className="font-mono text-xs opacity-50">vs</span>
        <span className="font-display text-lg font-black leading-none">
          {flagEmoji(m.b.country)} {m.b.name}
        </span>
      </div>
      <Divider />
      <p className="font-mono text-xs opacity-70">
        {total === 0
          ? "No predictions yet"
          : `${aVotes} predict ${m.a.name} · ${bVotes} predict ${m.b.name}`}
      </p>
      {total > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="self-start font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
        >
          {open ? "Hide takes" : `View takes (${total})`}
        </button>
      ) : null}
      {open ? (
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
      ) : null}
    </Card>
  );
}

export default function ZeroCupR32Page() {
  const eventId = ZERO_CUP_R32_EVENT_ID;
  const { byMatchup } = useZeroCupTakes(eventId);

  if (eventId === null) {
    return (
      <Card className="p-8">
        <p className="font-display text-xl">Registering on-chain, back shortly.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="filled">Live — voting until Jul 3</Pill>
          <span className="font-mono text-xs uppercase opacity-60">
            Event #{eventId}
          </span>
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          {ZERO_CUP_R32.title}
        </h1>
        <p className="font-body text-lg opacity-80 max-w-prose">
          {ZERO_CUP_R32.caption}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/zero-cup"
            className="inline-flex items-center gap-2 border border-rule bg-ink text-paper px-4 py-2 font-mono text-xs uppercase tracking-wide shadow-lift hover:-translate-y-px transition-transform"
          >
            View bracket →
          </Link>
          <span className="font-mono text-xs opacity-50">
            Grid view · mobile-friendly
          </span>
        </div>
        {ZERO_CUP_R32_EVENT_ROOT ? (
          <HashLink
            type="storage_root"
            value={ZERO_CUP_R32_EVENT_ROOT}
            label="Event metadata ·"
          />
        ) : null}
      </header>

      <Divider />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ZERO_CUP_R32.matchups.map((m) => (
          <MatchupCard key={m.id} m={m} takes={byMatchup.get(m.id) ?? []} />
        ))}
      </div>

      <Divider />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-black">
          Top takes across all matchups
        </h2>
        <Card className="p-6">
          <p className="font-body opacity-70">
            Once characters attach and predict, the sharpest takes surface here.
            On-chain upvoting lands in a later round.
          </p>
        </Card>
      </section>
    </div>
  );
}
