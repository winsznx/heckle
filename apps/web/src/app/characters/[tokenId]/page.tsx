"use client";

import { use, useMemo } from "react";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { archetype, gradePrediction, REP_SCORING } from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { TakeCard } from "@/components/TakeCard";
import { TransferControls } from "@/components/TransferControls";
import { CharacterPortrait, hasPortrait } from "@/components/CharacterPortrait";
import { HashLink } from "@/components/HashLink";
import {
  charactersContract,
  takesContract,
  contractConfigured,
} from "@/lib/contracts";
import { archetypeIdFromIndex, reputationIndex } from "@/lib/characters";
import {
  fetchBlob,
  hasVerifiedAttestation,
  type PersonalityBlob,
  type TakeBlob,
} from "@/lib/storage";

interface CharacterView {
  name: string;
  handle: string;
  archetype: number;
  paletteId: number;
  brief: string;
  personalityRoot: `0x${string}`;
  owner: `0x${string}`;
  reputationIndex: number;
  takesGenerated: number;
  predictionsCorrect: number;
  predictionsTotal: number;
  votesReceived: number;
  takes: {
    takeId: string;
    kind: number;
    timestamp: bigint;
    takeRoot: `0x${string}`;
    text: string | null;
    txHash: string;
    verified: boolean;
    matchupId: string;
    prediction: string | null;
  }[];
  eventsAttended: number;
}

export default function CharacterPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = use(params);
  const publicClient = usePublicClient();
  const configured = contractConfigured(charactersContract.address);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["character", tokenId, charactersContract.address],
    enabled: Boolean(publicClient) && configured,
    queryFn: async (): Promise<CharacterView> => {
      if (!publicClient) throw new Error("No public client.");
      const id = BigInt(tokenId);

      const [meta, owner] = await Promise.all([
        publicClient.readContract({
          address: charactersContract.address,
          abi: charactersContract.abi,
          functionName: "characterOf",
          args: [id],
        }),
        publicClient.readContract({
          address: charactersContract.address,
          abi: charactersContract.abi,
          functionName: "ownerOf",
          args: [id],
        }),
      ]);

      const blob = await fetchBlob<PersonalityBlob>(meta.personalityRoot);

      const repConfigured = contractConfigured(takesContract.address);
      let repIndex = 0;
      let takesGenerated = 0;
      let predictionsCorrect = 0;
      let predictionsTotal = 0;
      let votesReceived = 0;
      let takes: CharacterView["takes"] = [];
      const eventSet = new Set<string>();

      if (repConfigured) {
        try {
          const rep = await publicClient.readContract({
            address: takesContract.address,
            abi: takesContract.abi,
            functionName: "reputationOf",
            args: [id],
          });
          repIndex = reputationIndex({
            takesGenerated: rep.takesGenerated,
            votesReceived: rep.votesReceived,
            predictionsCorrect: rep.predictionsCorrect,
            predictionsTotal: rep.predictionsTotal,
            weightedScore: rep.weightedScore,
            firstTakeAt: rep.firstTakeAt,
            lastTakeAt: rep.lastTakeAt,
          });
          takesGenerated = Number(rep.takesGenerated);
          predictionsCorrect = Number(rep.predictionsCorrect);
          predictionsTotal = Number(rep.predictionsTotal);
          votesReceived = Number(rep.votesReceived);
        } catch {
          repIndex = 0;
        }

        const logs = await publicClient.getLogs({
          address: takesContract.address,
          event: takesContract.abi[0],
          args: { characterId: id },
          fromBlock: 36996000n,
          toBlock: "latest",
        });

        // Fetch every take blob concurrently — sequential awaits made this the
        // slowest page (one network round-trip per take).
        const resolved = await Promise.all(
          logs.map(async (log) => {
            const takeId = log.args.takeId;
            const kind = log.args.kind;
            const ts = log.args.timestamp;
            const root = log.args.takeRoot;
            const eventId = log.args.eventId;
            if (
              typeof takeId !== "bigint" ||
              typeof kind !== "number" ||
              typeof ts !== "bigint" ||
              typeof root !== "string"
            ) {
              return null;
            }
            const takeBlob = await fetchBlob<TakeBlob>(root);
            // Only surface takes from the verified pipeline; legacy blobs are orphaned.
            if (!hasVerifiedAttestation(takeBlob)) return null;
            return {
              eventId: typeof eventId === "bigint" ? eventId.toString() : null,
              row: {
                takeId: takeId.toString(),
                kind,
                timestamp: ts,
                takeRoot: root as `0x${string}`,
                text: takeBlob?.text ?? null,
                txHash: log.transactionHash ?? "",
                verified: takeBlob?.inferenceAttestation?.valid === true,
                matchupId:
                  typeof takeBlob?.matchupId === "string" ? takeBlob.matchupId : "",
                prediction:
                  typeof takeBlob?.prediction === "string" ? takeBlob.prediction : null,
              },
            };
          }),
        );

        for (const r of resolved) {
          if (!r) continue;
          if (r.eventId) eventSet.add(r.eventId);
          takes.push(r.row);
        }

        // Keep only the latest take per matchup — clean regenerations supersede
        // earlier ones on the append-only contract. Takes without a matchupId
        // (e.g. group-stage reactions) are one-per-trigger and kept as-is.
        const latestByKey = new Map<string, (typeof takes)[number]>();
        for (const t of takes) {
          const key = t.matchupId ? `m:${t.matchupId}` : `t:${t.takeId}`;
          const prev = latestByKey.get(key);
          if (!prev || BigInt(t.takeId) > BigInt(prev.takeId)) latestByKey.set(key, t);
        }
        takes = [...latestByKey.values()];
        takes.sort((a, b) => Number(a.timestamp - b.timestamp));
      }

      return {
        name: blob?.name ?? `Heckler #${tokenId}`,
        handle: blob?.handle ?? meta.handle,
        archetype: meta.archetype,
        paletteId: typeof blob?.palette === "number" ? blob.palette : 1,
        brief: blob?.personalityBrief ?? "",
        personalityRoot: meta.personalityRoot,
        owner,
        reputationIndex: repIndex,
        takesGenerated,
        predictionsCorrect,
        predictionsTotal,
        votesReceived,
        takes,
        eventsAttended: eventSet.size,
      };
    },
  });

  const record = useMemo(() => {
    const takes = data?.takes ?? [];
    let correct = 0;
    let wrong = 0;
    let pending = 0;
    for (const t of takes) {
      if (!t.matchupId) continue;
      const o = gradePrediction(t.matchupId, t.prediction);
      if (o === "correct") correct++;
      else if (o === "wrong") wrong++;
      else pending++;
    }
    const graded = correct + wrong;
    const rep = correct * REP_SCORING.correct + wrong * REP_SCORING.wrong;
    const acc = graded ? Math.round((correct / graded) * 100) : null;
    return { correct, wrong, pending, graded, rep, acc };
  }, [data]);

  if (!configured) {
    return (
      <Card className="p-8">
        <p className="font-display text-xl">Contracts not yet deployed</p>
        <p className="font-body opacity-70 mt-2">
          Character data is unavailable until the characters contract is
          configured.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return <p className="font-mono text-xs uppercase opacity-60">Loading…</p>;
  }

  if (isError || !data) {
    return (
      <Card className="p-8">
        <p className="font-display text-xl">Character not found</p>
        <p className="font-body opacity-70 mt-2">
          No on-chain record for token #{tokenId}.
        </p>
      </Card>
    );
  }

  const arch = archetype(archetypeIdFromIndex(data.archetype));

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col sm:flex-row gap-6 sm:items-end">
        {hasPortrait(tokenId) ? (
          <div className="h-36 w-36 sm:h-44 sm:w-44 shrink-0 border border-rule bg-whisper overflow-hidden">
            <CharacterPortrait
              tokenId={tokenId}
              name={data.name}
              className="h-full w-full grayscale"
              priority
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="filled">{arch.label}</Pill>
            <span className="font-mono text-xs opacity-60">Token #{tokenId}</span>
          </div>
          <h1 className="font-display font-black text-5xl leading-none">
            {data.name}
          </h1>
          <p className="font-mono text-sm opacity-70">@{data.handle}</p>
          <div className="flex flex-wrap items-center gap-4">
            <HashLink type="address" value={data.owner} label="Owner" />
            <span className="font-mono text-xs opacity-70">
              Reputation {record.rep >= 0 ? "+" : ""}
              {record.rep}
            </span>
            {record.acc !== null ? (
              <span className="font-mono text-xs opacity-70">
                {record.correct}/{record.graded} called · {record.acc}%
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <Divider />

      {data.brief ? (
        <section className="flex flex-col gap-3 max-w-prose">
          <h2 className="font-display text-2xl font-black">Personality</h2>
          <p className="font-body text-lg opacity-90">{data.brief}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-black">Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
          {[
            { label: "Events", value: data.eventsAttended },
            { label: "Takes", value: data.takes.length },
            {
              label: "Predictions",
              value: record.correct + record.wrong + record.pending,
            },
            { label: "Votes", value: data.votesReceived },
          ].map((stat) => (
            <div key={stat.label} className="bg-paper p-5 flex flex-col gap-1">
              <span className="font-mono text-xs uppercase opacity-60">
                {stat.label}
              </span>
              <span className="font-display text-2xl font-black">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {record.graded + record.pending > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-black">Track record</h2>
            <span className="font-mono text-xs uppercase tracking-wide opacity-50">
              Scored by reality
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
            {[
              { label: "Correct", value: `${record.correct}` },
              { label: "Wrong", value: `${record.wrong}` },
              { label: "Accuracy", value: record.acc === null ? "—" : `${record.acc}%` },
              { label: "Reputation", value: `${record.rep >= 0 ? "+" : ""}${record.rep}` },
            ].map((s) => (
              <div key={s.label} className="bg-paper p-5 flex flex-col gap-1">
                <span className="font-mono text-xs uppercase opacity-60">{s.label}</span>
                <span className="font-display text-2xl font-black">{s.value}</span>
              </div>
            ))}
          </div>
          {record.pending > 0 ? (
            <p className="font-mono text-xs opacity-60">
              {record.pending} prediction{record.pending === 1 ? "" : "s"} awaiting results.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-black">Take history</h2>
        {data.takes.length === 0 ? (
          <Card className="p-8">
            <p className="font-body opacity-70">
              No takes committed yet. Attach this heckler to a live event to
              start its record.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {data.takes.map((take) => (
              <TakeCard
                key={take.takeId}
                takeId={take.takeId}
                text={take.text}
                kind={take.kind}
                timestamp={take.timestamp}
                takeRoot={take.takeRoot}
                txHash={take.txHash}
                verified={take.verified}
                outcome={
                  take.matchupId
                    ? gradePrediction(take.matchupId, take.prediction)
                    : undefined
                }
                characterId={tokenId}
                characterName={data.name}
                archetypeLabel={arch.label}
              />
            ))}
          </div>
        )}
      </section>

      <TransferControls tokenId={tokenId} owner={data.owner} />
    </div>
  );
}
