"use client";

import { use } from "react";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { explorerAddress, archetype } from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { TakeCard } from "@/components/TakeCard";
import {
  charactersContract,
  takesContract,
  contractConfigured,
} from "@/lib/contracts";
import { archetypeIdFromIndex, reputationIndex } from "@/lib/characters";
import { fetchBlob, type PersonalityBlob, type TakeBlob } from "@/lib/storage";
import { truncateAddr } from "@/lib/format";

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
      const takes: CharacterView["takes"] = [];
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
          fromBlock: 0n,
          toBlock: "latest",
        });

        for (const log of logs) {
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
            continue;
          }
          if (typeof eventId === "bigint") eventSet.add(eventId.toString());
          const takeBlob = await fetchBlob<TakeBlob>(root);
          takes.push({
            takeId: takeId.toString(),
            kind,
            timestamp: ts,
            takeRoot: root as `0x${string}`,
            text: takeBlob?.text ?? null,
          });
        }
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
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="filled">{arch.label}</Pill>
          <span className="font-mono text-xs opacity-60">Token #{tokenId}</span>
        </div>
        <h1 className="font-display font-black text-5xl leading-none">
          {data.name}
        </h1>
        <p className="font-mono text-sm opacity-70">@{data.handle}</p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={explorerAddress(charactersContract.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs opacity-70 hover:opacity-100"
          >
            Owner {truncateAddr(data.owner)} · chainscan
          </a>
          <span className="font-mono text-xs opacity-70">
            Reputation {data.reputationIndex}
          </span>
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
            { label: "Takes", value: data.takesGenerated },
            {
              label: "Predictions",
              value: `${data.predictionsCorrect}/${data.predictionsTotal}`,
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
                text={take.text}
                kind={take.kind}
                timestamp={take.timestamp}
                takeRoot={take.takeRoot}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
