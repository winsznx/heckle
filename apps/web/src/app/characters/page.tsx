"use client";

import Link from "next/link";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { archetype } from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { CharacterPortrait, hasPortrait } from "@/components/CharacterPortrait";
import {
  charactersContract,
  takesContract,
  contractConfigured,
} from "@/lib/contracts";
import { archetypeIdFromIndex, reputationIndex } from "@/lib/characters";
import { fetchBlob, type PersonalityBlob } from "@/lib/storage";
import { truncateAddr } from "@/lib/format";

interface CharacterSummary {
  tokenId: string;
  name: string;
  archetype: number;
  owner: string;
  reputationIndex: number;
  takeCount: number;
}

function CharacterTile({
  c,
  featured = false,
}: {
  c: CharacterSummary;
  featured?: boolean;
}) {
  const arch = archetype(archetypeIdFromIndex(c.archetype));
  const portrait = hasPortrait(c.tokenId);
  return (
    <Link href={`/characters/${c.tokenId}`} className="block">
      <Card
        className={`overflow-hidden flex transition-transform hover:-translate-y-px ${
          featured ? "flex-col sm:flex-row" : "flex-col"
        }`}
      >
        {portrait ? (
          <div
            className={`bg-whisper shrink-0 ${
              featured
                ? "border-b sm:border-b-0 sm:border-r border-rule sm:w-56"
                : "border-b border-rule"
            }`}
          >
            <CharacterPortrait
              tokenId={c.tokenId}
              name={c.name}
              className={`w-full grayscale ${
                featured ? "h-56 sm:h-full" : "h-44"
              }`}
            />
          </div>
        ) : null}
        <div
          className={`flex flex-col gap-3 ${featured ? "p-8" : "p-5"} ${
            portrait && featured ? "sm:flex-1" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <Pill tone="filled">{arch.label}</Pill>
            {featured ? (
              <span className="font-mono text-xs uppercase tracking-wide opacity-60">
                Featured
              </span>
            ) : (
              <span className="font-mono text-xs opacity-50">#{c.tokenId}</span>
            )}
          </div>
          <h3
            className={`font-display font-black leading-none ${
              featured ? "text-4xl" : "text-2xl"
            }`}
          >
            {c.name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs opacity-60">
            <span>{c.takeCount} takes</span>
            <span>Rep {c.reputationIndex}</span>
            <span>Owner {truncateAddr(c.owner)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function CharactersIndexPage() {
  const publicClient = usePublicClient();
  const configured = contractConfigured(charactersContract.address);

  const { data, isLoading } = useQuery({
    queryKey: ["characters-index", charactersContract.address],
    enabled: Boolean(publicClient) && configured,
    queryFn: async (): Promise<CharacterSummary[]> => {
      if (!publicClient) return [];
      const logs = await publicClient.getLogs({
        address: charactersContract.address,
        event: charactersContract.abi[0],
        fromBlock: 36996000n,
        toBlock: "latest",
      });

      const seen = new Set<string>();
      const minted = logs
        .map((l) => ({
          tokenId: l.args.tokenId,
          owner: l.args.owner,
          archetype: l.args.archetype,
          personalityRoot: l.args.personalityRoot,
        }))
        .filter(
          (m): m is {
            tokenId: bigint;
            owner: `0x${string}`;
            archetype: number;
            personalityRoot: `0x${string}`;
          } =>
            typeof m.tokenId === "bigint" &&
            typeof m.owner === "string" &&
            typeof m.archetype === "number" &&
            typeof m.personalityRoot === "string",
        )
        .filter((m) => {
          const k = m.tokenId.toString();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

      const repConfigured = contractConfigured(takesContract.address);

      const summaries = await Promise.all(
        minted.map(async (m): Promise<CharacterSummary> => {
          const blob = await fetchBlob<PersonalityBlob>(m.personalityRoot);
          let repIndex = 0;
          let takeCount = 0;
          if (repConfigured) {
            try {
              const rep = await publicClient.readContract({
                address: takesContract.address,
                abi: takesContract.abi,
                functionName: "reputationOf",
                args: [m.tokenId],
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
              takeCount = Number(rep.takesGenerated);
            } catch {
              repIndex = 0;
            }
          }
          return {
            tokenId: m.tokenId.toString(),
            name: blob?.name ?? `Heckler #${m.tokenId.toString()}`,
            archetype: m.archetype,
            owner: m.owner,
            reputationIndex: repIndex,
            takeCount,
          };
        }),
      );

      // Only surface characters that have actually done something — empty
      // test/early mints stay on-chain but don't clutter the roster.
      return summaries
        .filter((s) => s.takeCount > 0)
        .sort((a, b) => b.reputationIndex - a.reputationIndex);
    },
  });

  const featured = data?.find((c) => c.tokenId === "0");
  const rest = data?.filter((c) => c.tokenId !== "0") ?? [];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display font-black text-4xl md:text-5xl">Characters</h1>
        <p className="font-mono text-xs uppercase tracking-wide opacity-60">
          Active heckle personalities, ranked by earned reputation.
        </p>
      </header>

      <Divider />

      {!configured || isLoading ? (
        <p className="font-mono text-xs uppercase opacity-60">Loading characters…</p>
      ) : !data || data.length === 0 ? (
        <Card className="p-8 flex flex-col gap-2">
          <p className="font-display text-xl">No characters minted yet.</p>
          <Link
            href="/create"
            className="font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            Mint the first →
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {featured ? <CharacterTile c={featured} featured /> : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((c) => (
              <CharacterTile key={c.tokenId} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
