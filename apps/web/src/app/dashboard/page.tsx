"use client";

import Link from "next/link";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { DEMO_EVENT } from "@heckle/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { CharacterCard } from "@/components/CharacterCard";
import { NetworkGate } from "@/components/NetworkGate";
import {
  charactersContract,
  takesContract,
  contractConfigured,
} from "@/lib/contracts";
import { archetypeIdFromIndex, reputationIndex } from "@/lib/characters";
import { fetchBlob, type PersonalityBlob } from "@/lib/storage";

interface OwnedCharacter {
  tokenId: bigint;
  archetype: number;
  handle: string;
  name: string;
  paletteId: number;
  reputationIndex: number;
}

function DashboardInner() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const configured = contractConfigured(charactersContract.address);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["owned-characters", address, charactersContract.address],
    enabled: Boolean(address) && Boolean(publicClient) && configured,
    queryFn: async (): Promise<OwnedCharacter[]> => {
      if (!publicClient || !address) return [];

      const logs = await publicClient.getLogs({
        address: charactersContract.address,
        event: charactersContract.abi[0],
        args: { owner: address },
        fromBlock: 36996000n,
        toBlock: "latest",
      });

      const tokenIds = logs
        .map((log) => log.args.tokenId)
        .filter((id): id is bigint => typeof id === "bigint");

      const unique = Array.from(new Set(tokenIds.map((id) => id.toString()))).map(
        (s) => BigInt(s),
      );

      const repConfigured = contractConfigured(takesContract.address);

      const results = await Promise.all(
        unique.map(async (tokenId) => {
          const meta = await publicClient.readContract({
            address: charactersContract.address,
            abi: charactersContract.abi,
            functionName: "characterOf",
            args: [tokenId],
          });

          const blob = await fetchBlob<PersonalityBlob>(meta.personalityRoot);

          let repIndex = 0;
          if (repConfigured) {
            try {
              const rep = await publicClient.readContract({
                address: takesContract.address,
                abi: takesContract.abi,
                functionName: "reputationOf",
                args: [tokenId],
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
            } catch {
              repIndex = 0;
            }
          }

          return {
            tokenId,
            archetype: meta.archetype,
            handle: meta.handle,
            name: blob?.name ?? `Heckler #${tokenId.toString()}`,
            paletteId: typeof blob?.palette === "number" ? blob.palette : 1,
            reputationIndex: repIndex,
          };
        }),
      );

      return results.sort((a, b) => Number(a.tokenId - b.tokenId));
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <h1 className="font-display font-black text-4xl">Your hecklers</h1>
        <Link href="/create">
          <Button>New heckler</Button>
        </Link>
      </div>
      <Divider />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-black">Live now</h2>
        <Card className="p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Pill tone="filled">Live</Pill>
              <span className="font-mono text-xs uppercase opacity-60">
                Demo event
              </span>
            </div>
            <p className="font-display text-xl font-black">{DEMO_EVENT.title}</p>
            <p className="font-body text-sm opacity-70">
              {DEMO_EVENT.homeTeam} vs {DEMO_EVENT.awayTeam}
            </p>
          </div>
          <Link href={`/events/${DEMO_EVENT.id}`}>
            <Button variant="secondary">Open event</Button>
          </Link>
        </Card>
      </section>

      <Divider />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-black">Owned characters</h2>

        {!configured ? (
          <Card className="p-8 flex flex-col gap-3 items-start">
            <p className="font-display text-xl">Contracts not yet deployed</p>
            <p className="font-body opacity-70 max-w-prose">
              The characters contract address isn&apos;t configured for this
              environment. Once deployed, your minted hecklers will appear here.
            </p>
            <Link href="/create">
              <Button>Go to create</Button>
            </Link>
          </Card>
        ) : isLoading ? (
          <p className="font-mono text-xs uppercase opacity-60">Loading…</p>
        ) : isError ? (
          <Card className="p-8">
            <p className="font-body opacity-70">
              Couldn&apos;t read your characters from chain. Try again shortly.
            </p>
          </Card>
        ) : !data || data.length === 0 ? (
          <Card className="p-8 flex flex-col gap-3 items-start">
            <p className="font-display text-xl">No hecklers yet</p>
            <p className="font-body opacity-70 max-w-prose">
              Mint your first personality and it&apos;ll show up here, ready to
              attach to a live event.
            </p>
            <Link href="/create">
              <Button>Create your first heckler</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((c) => (
              <Link key={c.tokenId.toString()} href={`/characters/${c.tokenId}`}>
                <CharacterCard
                  name={c.name}
                  handle={c.handle}
                  archetypeId={archetypeIdFromIndex(c.archetype)}
                  paletteId={c.paletteId}
                  reputationIndex={c.reputationIndex}
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <NetworkGate>
      <DashboardInner />
    </NetworkGate>
  );
}
