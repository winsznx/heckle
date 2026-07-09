"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { archetype, gradePrediction, REP_SCORING, isInftMigrated } from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { TakeCard } from "@/components/TakeCard";
import { TransferControls } from "@/components/TransferControls";
import { Erc8004Badge } from "@/components/Erc8004Badge";
import {
  CharacterPortrait,
  hasPortrait,
  portraitRoot,
} from "@/components/CharacterPortrait";
import { HashLink } from "@/components/HashLink";
import {
  charactersContract,
  inftContract,
  takesContract,
  verifiedTakesContract,
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
  imageRoot: string | null;
  personalityRoot: `0x${string}`;
  /** True once this character is a real ERC-7857 INFT (migrated). */
  isInft: boolean;
  /** The encrypted personality core's on-chain commitment (INFT only). */
  sealedCoreHash: `0x${string}` | null;
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
    contractVerified: boolean;
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
      const useInft = isInftMigrated(tokenId);
      const ZERO_HASH = `0x${"0".repeat(64)}` as `0x${string}`;

      let name: string;
      let handle: string;
      let archetypeIdx: number;
      let brief: string;
      let paletteId: number;
      let imageRoot: string | null;
      let personalityRoot: `0x${string}`;
      let sealedCoreHash: `0x${string}` | null;
      let owner: `0x${string}`;

      if (useInft) {
        // Real ERC-7857 identity: public card on-chain, personality core sealed.
        const [meta, o, datas] = await Promise.all([
          publicClient.readContract({ address: inftContract.address, abi: inftContract.abi, functionName: "characterOf", args: [id] }),
          publicClient.readContract({ address: inftContract.address, abi: inftContract.abi, functionName: "ownerOf", args: [id] }),
          publicClient.readContract({ address: inftContract.address, abi: inftContract.abi, functionName: "intelligentDatasOf", args: [id] }),
        ]);
        name = meta.name;
        handle = meta.handle;
        archetypeIdx = meta.archetype;
        brief = "";
        paletteId = 1;
        imageRoot = null;
        sealedCoreHash = datas.length > 0 ? datas[0].dataHash : null;
        personalityRoot = sealedCoreHash ?? ZERO_HASH;
        owner = o;
      } else {
        const [meta, o] = await Promise.all([
          publicClient.readContract({ address: charactersContract.address, abi: charactersContract.abi, functionName: "characterOf", args: [id] }),
          publicClient.readContract({ address: charactersContract.address, abi: charactersContract.abi, functionName: "ownerOf", args: [id] }),
        ]);
        const blob = await fetchBlob<PersonalityBlob>(meta.personalityRoot);
        name = blob?.name ?? `Heckler #${tokenId}`;
        handle = blob?.handle ?? meta.handle;
        archetypeIdx = meta.archetype;
        brief = blob?.personalityBrief ?? "";
        paletteId = typeof blob?.palette === "number" ? blob.palette : 1;
        imageRoot = typeof blob?.imageRoot === "string" ? blob.imageRoot : null;
        personalityRoot = meta.personalityRoot;
        sealedCoreHash = null;
        owner = o;
      }

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

        // Contract-verified annotation (best-effort): takeRoots recorded on
        // HeckleVerifiedTakes for this character. Never gates the take list.
        const verifiedRoots = new Set<string>();
        try {
          const vLogs = await publicClient.getLogs({
            address: verifiedTakesContract.address,
            event: verifiedTakesContract.abi[0],
            args: { characterId: id },
            fromBlock: 36996000n,
            toBlock: "latest",
          });
          for (const vl of vLogs) {
            const r = vl.args.takeRoot;
            if (typeof r === "string") verifiedRoots.add(r.toLowerCase());
          }
        } catch {
          /* annotation only */
        }

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
                contractVerified: verifiedRoots.has(root.toLowerCase()),
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
        name,
        handle,
        archetype: archetypeIdx,
        paletteId,
        brief,
        imageRoot,
        personalityRoot,
        isInft: useInft,
        sealedCoreHash,
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
  const imageOnChainRoot = portraitRoot(tokenId) ?? data.imageRoot;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col sm:flex-row gap-6 sm:items-end">
        {hasPortrait(tokenId) || data.imageRoot ? (
          <div className="flex flex-col gap-2 shrink-0">
            <div className="h-36 w-36 sm:h-44 sm:w-44 border border-rule bg-whisper overflow-hidden">
              <CharacterPortrait
                tokenId={tokenId}
                name={data.name}
                imageRoot={data.imageRoot}
                className="h-full w-full grayscale"
                priority
              />
            </div>
            {imageOnChainRoot ? (
              <HashLink
                type="storage_root"
                value={imageOnChainRoot}
                label="Portrait on 0G ·"
              />
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="filled">{arch.label}</Pill>
            <span className="font-mono text-xs opacity-60">Token #{tokenId}</span>
            {data.isInft ? (
              <Link
                href="/transfer-guarantees"
                title="Real ERC-7857 INFT — encrypted personality core, oracle-gated transfer"
                className="inline-flex hover:-translate-y-px transition-transform"
              >
                <Pill tone="filled">ERC-7857 INFT ↗</Pill>
              </Link>
            ) : null}
            <Erc8004Badge tokenId={Number(tokenId)} />
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

      {data.isInft ? (
        <section className="flex flex-col gap-3 max-w-prose">
          <h2 className="font-display text-2xl font-black">Personality core</h2>
          <div className="flex flex-col gap-2 border border-rule bg-whisper p-4">
            <div className="flex items-center gap-2">
              <span aria-hidden>🔒</span>
              <span className="font-mono text-xs uppercase tracking-wide">
                Encrypted · ERC-7857
              </span>
            </div>
            <p className="font-body text-sm opacity-70">
              The system seed, strategy, and owner-gated memory are sealed on 0G Storage —
              only the current owner can decrypt them. This public profile needs none of it.
            </p>
            {data.sealedCoreHash ? (
              <HashLink type="storage_root" value={data.sealedCoreHash} label="Sealed core on 0G ·" />
            ) : null}
            <Link
              href="/transfer-guarantees"
              className="font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              What a transfer guarantees →
            </Link>
          </div>
        </section>
      ) : data.brief ? (
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
                contractVerified={take.contractVerified}
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

      {data.isInft ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-black">Transfer</h2>
          <Card className="p-6 flex flex-col gap-3">
            <p className="font-body opacity-80 max-w-prose">
              This is a real ERC-7857 INFT. Transfer isn&rsquo;t a plain send — the oracle
              re-encrypts the private core and seals it to the buyer, and the contract
              rotates the on-chain data hash. Ownership and the public record move; the
              seller&rsquo;s old key can&rsquo;t open the new payload.
            </p>
            <Link
              href="/transfer-guarantees"
              className="font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              Exactly what a transfer guarantees →
            </Link>
          </Card>
        </section>
      ) : (
        <TransferControls tokenId={tokenId} owner={data.owner} />
      )}
    </div>
  );
}
