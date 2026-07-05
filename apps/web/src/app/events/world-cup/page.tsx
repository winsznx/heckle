"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  WORLD_CUP_EVENT_ID,
  stageLabel,
  type WcFixture,
} from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { TakeCard } from "@/components/TakeCard";
import { useZeroCupTakes, type MatchTake } from "@/lib/useZeroCupTakes";
import {
  useWorldCup,
  useResolverResults,
  type ResolverResult,
} from "@/lib/useWorldCup";
import { resolverContract } from "@/lib/contracts";

const RESOLVER_URL = `https://chainscan.0g.ai/address/${resolverContract.address}`;

function fmtKickoff(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    }) + " UTC"
  );
}

function winnerName(f: WcFixture): string | null {
  if (f.score.outcome === "HOME") return f.home.name;
  if (f.score.outcome === "AWAY") return f.away.name;
  if (f.score.outcome === "DRAW") return "Draw";
  return null;
}

function gradeTake(f: WcFixture, prediction: string | null): "correct" | "wrong" | null {
  const w = winnerName(f);
  if (!w || !prediction) return null;
  return prediction.trim().toLowerCase() === w.trim().toLowerCase()
    ? "correct"
    : "wrong";
}

function ResolveButton() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/worldcup/resolve", { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        setStatus("error");
        setMsg(data.error === "unconfigured" ? "resolver offline" : "couldn't reach the feed");
        return;
      }
      const n = data.settled?.length ?? 0;
      setStatus("done");
      setMsg(
        n > 0
          ? `Settled ${n} result${n === 1 ? "" : "s"} on-chain`
          : data.cooldown
            ? "just ran — try again shortly"
            : "all results already settled",
      );
      qc.invalidateQueries({ queryKey: ["resolver-results"] });
      qc.invalidateQueries({ queryKey: ["worldcup"] });
    } catch {
      setStatus("error");
      setMsg("network error");
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 border border-rule bg-ink text-paper px-4 py-2 font-mono text-xs uppercase tracking-wide hover:-translate-y-px transition-transform disabled:opacity-50"
      >
        {status === "loading" ? "Resolving…" : "Resolve results on-chain"}
      </button>
      {msg ? <span className="font-mono text-xs opacity-60">{msg}</span> : null}
    </span>
  );
}

function TeamRow({ name, tla, score }: { name: string; tla: string | null; score?: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-display text-lg font-black leading-none">
        {name}
        {tla ? <span className="font-mono text-xs opacity-40 ml-2">{tla}</span> : null}
      </span>
      {typeof score === "number" ? (
        <span className="font-display text-2xl font-black leading-none">{score}</span>
      ) : null}
    </div>
  );
}

function TakeList({ takes }: { takes: MatchTake[] }) {
  return (
    <div className="flex flex-col gap-3">
      {takes.map((t) => (
        <TakeCard
          key={t.takeId}
          takeId={t.takeId}
          text={t.text}
          kind={t.kind}
          timestamp={t.timestamp}
          takeRoot={t.takeRoot}
          txHash={t.txHash}
          verified={t.verified}
          characterId={t.characterId}
          characterName={t.characterName}
          archetypeLabel={t.archetypeLabel}
        />
      ))}
    </div>
  );
}

function UpcomingCard({ f, takes }: { f: WcFixture; takes: MatchTake[] }) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide opacity-50">
          {stageLabel(f.stage)}
        </span>
        <span className="font-mono text-xs uppercase tracking-wide opacity-40">
          {fmtKickoff(f.utcDate)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <TeamRow name={f.home.name} tla={f.home.tla} />
        <span className="font-mono text-xs opacity-40">vs</span>
        <TeamRow name={f.away.name} tla={f.away.tla} />
      </div>
      <Divider />
      {takes.length > 0 ? (
        <TakeList takes={takes} />
      ) : (
        <p className="font-mono text-xs opacity-50">
          The Pundit calls this one on-chain — same pipeline as Zero Cup.
        </p>
      )}
    </Card>
  );
}

function ResultCard({
  f,
  takes,
  resolved,
}: {
  f: WcFixture;
  takes: MatchTake[];
  resolved?: ResolverResult;
}) {
  const w = winnerName(f);
  const call = takes.find((t) => t.prediction);
  const grade = call ? gradeTake(f, call.prediction) : null;
  const settled = resolved?.finalized === true;

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wide opacity-50">
          {stageLabel(f.stage)} · full time
        </span>
        {settled ? (
          <a
            href={RESOLVER_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-60 hover:opacity-100"
          >
            Settled on-chain ✓
          </a>
        ) : (
          <span className="font-mono text-xs uppercase tracking-wide opacity-30">
            Football
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <TeamRow name={f.home.name} tla={f.home.tla} score={f.score.home} />
        <TeamRow name={f.away.name} tla={f.away.tla} score={f.score.away} />
      </div>
      {w ? (
        <span className="font-mono text-xs uppercase tracking-wide opacity-60">
          {w === "Draw" ? "Draw" : `${w} advance`}
        </span>
      ) : null}
      {call ? (
        <>
          <Divider />
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs uppercase tracking-wide opacity-50">
              The Pundit called {call.prediction}
            </span>
            {grade ? (
              <Pill tone={grade === "correct" ? "filled" : "default"}>
                {grade === "correct" ? "Called it ✓" : "Missed ✗"}
              </Pill>
            ) : null}
          </div>
        </>
      ) : null}
    </Card>
  );
}

export default function WorldCupPage() {
  const { byMatchup } = useZeroCupTakes(WORLD_CUP_EVENT_ID);
  const { data, isLoading } = useWorldCup();
  const recentIds = data.recent.map((f) => f.matchId);
  const resolved = useResolverResults(recentIds);

  const takesFor = (f: WcFixture) => byMatchup.get(String(f.matchId)) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="filled">World Cup mode</Pill>
          <span className="font-mono text-xs uppercase tracking-wide opacity-60">
            Live · football-data.org
          </span>
        </div>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          The same engine, on real football.
        </h1>
        <p className="font-body text-lg opacity-80 max-w-prose">
          These are the <b>real</b> 2026 World Cup knockout fixtures, live from
          the official feed. The Pundit calls each tie before kickoff — a
          TEE-attested take, a 0G receipt, a prediction committed on-chain. When
          the result lands, it&rsquo;s settled on-chain through{" "}
          <a
            href={RESOLVER_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            HeckleResolver
          </a>{" "}
          and scored against reality. Same loop as Zero Cup — on live sport.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Link
            href="/zero-cup"
            className="inline-flex items-center gap-2 border border-rule bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide hover:bg-whisper transition-colors"
          >
            Back to the Zero Cup bracket
          </Link>
          <ResolveButton />
        </div>
        <p className="font-mono text-xs uppercase tracking-wide opacity-50">
          Results settle autonomously as matches finish — or anyone can trigger it. No stakes, no payouts; it just writes the true outcome so a call can be scored.
        </p>
      </header>

      <Divider />

      {!data.configured ? (
        <Card className="p-8 flex flex-col gap-2">
          <p className="font-display text-xl">Live feed connecting…</p>
          <p className="font-body opacity-70 text-sm">
            The World Cup feed comes online once the data source is configured on
            the server. The on-chain pieces — takes, receipts, resolver — are
            already live.
          </p>
        </Card>
      ) : isLoading ? (
        <p className="font-mono text-xs uppercase opacity-60">Loading fixtures…</p>
      ) : (
        <div className="flex flex-col gap-10">
          {data.upcoming.length > 0 ? (
            <section className="flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <h2 className="font-display text-2xl font-black">Upcoming knockouts</h2>
                <span className="font-mono text-xs uppercase tracking-wide opacity-50">
                  The Pundit&rsquo;s calls
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.upcoming.map((f) => (
                  <UpcomingCard key={f.matchId} f={f} takes={takesFor(f)} />
                ))}
              </div>
            </section>
          ) : null}

          {data.recent.length > 0 ? (
            <section className="flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <h2 className="font-display text-2xl font-black">Results</h2>
                <span className="font-mono text-xs uppercase tracking-wide opacity-50">
                  Scored by reality
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.recent.map((f) => (
                  <ResultCard
                    key={f.matchId}
                    f={f}
                    takes={takesFor(f)}
                    resolved={resolved.get(f.matchId)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <Card className="border border-rule bg-ink text-paper p-8 flex flex-col gap-3">
        <h2 className="font-display text-2xl md:text-3xl font-black">
          One engine. Every arena.
        </h2>
        <p className="font-body opacity-80 max-w-prose">
          Every event — Zero Cup or World Cup — flows through the same adapter:
          <span className="font-mono">
            {" "}
            character → take → 0G Storage → on-chain commit → real result →
            reputation
          </span>
          . The result itself is written to{" "}
          <a
            href={RESOLVER_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            HeckleResolver
          </a>{" "}
          on 0G mainnet, so grading settles against an auditable on-chain record —
          not a trusted claim.
        </p>
      </Card>
    </div>
  );
}
