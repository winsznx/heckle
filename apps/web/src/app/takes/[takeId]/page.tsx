"use client";

import { use } from "react";
import Link from "next/link";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  archetype,
  gradePrediction,
  REP_SCORING,
  ZERO_CUP_R16_MATCHUPS,
  ZERO_CUP_R32_MATCHUPS,
  ZERO_CUP_R32_RESULTS,
  type PredictionOutcome,
  type ZeroCupMatchup,
} from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { HashLink } from "@/components/HashLink";
import { ContractVerifiedBadge } from "@/components/ContractVerifiedBadge";
import { TakeShareCard } from "@/components/TakeShareCard";
import {
  charactersContract,
  takesContract,
  contractConfigured,
} from "@/lib/contracts";
import {
  fetchBlob,
  type PersonalityBlob,
  type TakeBlob,
} from "@/lib/storage";
import { archetypeIdFromIndex } from "@/lib/characters";
import { formatTs, parseConfidence, flagEmoji, truncateAddr } from "@/lib/format";

const KIND_LABELS = ["Reaction", "Prediction", "Debate"] as const;

const MATCHUPS = new Map<string, ZeroCupMatchup>(
  [...ZERO_CUP_R32_MATCHUPS, ...ZERO_CUP_R16_MATCHUPS].map((m) => [m.id, m]),
);

interface TakeView {
  takeId: string;
  characterId: string;
  characterName: string;
  archetypeLabel: string;
  owner: `0x${string}`;
  kind: number;
  text: string | null;
  prediction: string | null;
  confidence: number | null;
  matchupId: string;
  takeRoot: `0x${string}`;
  txHash: string;
  timestamp: bigint;
  verified: boolean;
  outcome: PredictionOutcome;
  repDelta: number;
}

const OUTCOME_TONE: Record<PredictionOutcome, string> = {
  correct: "Called it ✓",
  wrong: "Missed",
  pending: "Awaiting result",
};

export default function TakePage({
  params,
}: {
  params: Promise<{ takeId: string }>;
}) {
  const { takeId } = use(params);
  const publicClient = usePublicClient();
  const configured = contractConfigured(takesContract.address);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["take", takeId],
    enabled: Boolean(publicClient) && configured,
    queryFn: async (): Promise<TakeView> => {
      if (!publicClient) throw new Error("No public client.");
      const logs = await publicClient.getLogs({
        address: takesContract.address,
        event: takesContract.abi[0],
        args: { takeId: BigInt(takeId) },
        fromBlock: 36996000n,
        toBlock: "latest",
      });
      const log = logs[0];
      if (!log) throw new Error("Take not found on-chain.");

      const characterId = log.args.characterId as bigint;
      const kind = log.args.kind as number;
      const ts = log.args.timestamp as bigint;
      const root = log.args.takeRoot as `0x${string}`;

      const blob = await fetchBlob<TakeBlob>(root);
      const meta = await publicClient.readContract({
        address: charactersContract.address,
        abi: charactersContract.abi,
        functionName: "characterOf",
        args: [characterId],
      });
      const owner = await publicClient.readContract({
        address: charactersContract.address,
        abi: charactersContract.abi,
        functionName: "ownerOf",
        args: [characterId],
      });
      const pblob = await fetchBlob<PersonalityBlob>(meta.personalityRoot);

      const matchupId = typeof blob?.matchupId === "string" ? blob.matchupId : "";
      const prediction = typeof blob?.prediction === "string" ? blob.prediction : null;
      const outcome = gradePrediction(matchupId, prediction);
      const repDelta =
        outcome === "correct"
          ? REP_SCORING.correct
          : outcome === "wrong"
            ? REP_SCORING.wrong
            : 0;

      return {
        takeId,
        characterId: characterId.toString(),
        characterName: pblob?.name ?? `Heckler #${characterId}`,
        archetypeLabel: archetype(archetypeIdFromIndex(meta.archetype)).label,
        owner,
        kind,
        text: blob?.text ?? null,
        prediction,
        confidence: parseConfidence(blob?.text),
        matchupId,
        takeRoot: root,
        txHash: String(log.transactionHash ?? ""),
        timestamp: ts,
        verified: blob?.inferenceAttestation?.valid === true,
        outcome,
        repDelta,
      };
    },
  });

  if (!configured) {
    return (
      <Card className="p-8">
        <p className="font-display text-xl">Contracts not configured.</p>
      </Card>
    );
  }
  if (isLoading) {
    return (
      <Card className="p-8">
        <p className="font-mono text-xs uppercase tracking-wide opacity-60">
          Loading proof from 0G…
        </p>
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card className="p-8 flex flex-col gap-3">
        <p className="font-display text-xl">Take not found.</p>
        <Link href="/zero-cup" className="font-mono text-xs uppercase underline underline-offset-2">
          Back to the bracket →
        </Link>
      </Card>
    );
  }

  const m = MATCHUPS.get(data.matchupId);
  const actual = ZERO_CUP_R32_RESULTS[data.matchupId];

  return (
    <div className="flex flex-col gap-6 max-w-prose mx-auto">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="filled">Proof of Take</Pill>
          <span className="font-mono text-xs uppercase tracking-wide opacity-60">
            #{data.takeId} · {KIND_LABELS[data.kind] ?? "Take"}
          </span>
        </div>
        <p className="font-mono text-sm opacity-70">Stored before the result. Scored after reality.</p>
      </header>

      <Card className="p-6 flex flex-col gap-5">
        {m ? (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase tracking-wide opacity-50">
              {m.label} · {m.bracket}
            </span>
            <span className="font-display text-lg font-black leading-none">
              {flagEmoji(m.a.country)} {m.a.name}
              <span className="opacity-40"> vs </span>
              {flagEmoji(m.b.country)} {m.b.name}
            </span>
          </div>
        ) : null}

        {data.text ? (
          <blockquote className="font-display text-2xl font-black leading-tight">
            &ldquo;{data.text}&rdquo;
          </blockquote>
        ) : (
          <p className="font-mono text-xs opacity-50">Take content unavailable.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/characters/${data.characterId}`}
            className="font-mono text-xs underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
          >
            {data.characterName} · {data.archetypeLabel}
          </Link>
          {data.prediction ? (
            <Pill>
              Pick: {data.prediction}
              {data.confidence !== null ? ` · ${data.confidence}%` : ""}
            </Pill>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-wide opacity-50">
          Outcome
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone={data.outcome === "correct" ? "filled" : "default"}>
            {OUTCOME_TONE[data.outcome]}
          </Pill>
          {actual ? (
            <span className="font-mono text-xs opacity-70">
              Result: {actual}
            </span>
          ) : (
            <span className="font-mono text-xs opacity-50">Result pending</span>
          )}
          {data.outcome !== "pending" ? (
            <span className="font-mono text-xs opacity-70">
              Reputation {data.repDelta >= 0 ? "+" : ""}
              {data.repDelta}
            </span>
          ) : null}
        </div>
        {data.prediction && actual ? (
          <p className="font-mono text-xs opacity-60">
            Predicted <b>{data.prediction}</b> → reality said <b>{actual}</b>.
          </p>
        ) : null}
      </Card>

      <Card className="p-6 flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-wide opacity-50">
          Receipt
        </span>
        <div className="flex flex-col gap-2">
          <HashLink type="storage_root" value={data.takeRoot} label="Stored on 0G ·" />
          {data.txHash ? (
            <HashLink type="tx_hash" value={data.txHash} label="Committed ·" />
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs opacity-60">
            <span>{formatTs(data.timestamp)}</span>
            <span>owner {truncateAddr(data.owner)}</span>
            {data.verified ? (
              <span>TEE replay valid ✓</span>
            ) : (
              <span>replay pending</span>
            )}
          </div>
        </div>
        <ContractVerifiedBadge root={data.takeRoot} />
        <Divider />
        <Link
          href={`/storage/${data.takeRoot}`}
          className="self-start font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
        >
          Replay the TEE attestation →
        </Link>
      </Card>

      <TakeShareCard
        takeId={data.takeId}
        character={`${data.characterName} · ${data.archetypeLabel}`}
        matchup={m ? `${m.a.name} vs ${m.b.name}` : data.matchupId}
        prediction={data.prediction}
        confidence={data.confidence}
        text={data.text}
        takeRoot={data.takeRoot}
        txHash={data.txHash}
        status={data.outcome}
      />
    </div>
  );
}
