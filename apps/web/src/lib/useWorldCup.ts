"use client";

import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import type { WcFixture, WcOutcome } from "@heckle/shared";
import { resolverContract, contractConfigured } from "./contracts";

export interface WorldCupData {
  configured: boolean;
  upcoming: WcFixture[];
  recent: WcFixture[];
  season: number;
  error?: string;
}

const EMPTY: WorldCupData = {
  configured: false,
  upcoming: [],
  recent: [],
  season: 2026,
};

/** Real WC fixtures + results via the server route (football-data.org). */
export function useWorldCup(): { data: WorldCupData; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["worldcup"],
    refetchInterval: 120_000,
    queryFn: async (): Promise<WorldCupData> => {
      const res = await fetch("/api/worldcup");
      if (!res.ok) throw new Error("worldcup feed failed");
      return (await res.json()) as WorldCupData;
    },
  });
  return { data: data ?? EMPTY, isLoading };
}

export interface ResolverResult {
  outcome: WcOutcome | null;
  homeScore: number;
  awayScore: number;
  finalized: boolean;
}

function outcomeFromEnum(n: number): WcOutcome | null {
  if (n === 1) return "HOME";
  if (n === 2) return "AWAY";
  if (n === 3) return "DRAW";
  return null;
}

/** On-chain HeckleResolver record for a set of match ids. */
export function useResolverResults(
  matchIds: number[],
): Map<number, ResolverResult> {
  const publicClient = usePublicClient();
  const configured = contractConfigured(resolverContract.address);
  const key = matchIds.slice().sort((a, b) => a - b).join(",");

  const { data } = useQuery({
    queryKey: ["resolver-results", key],
    enabled: Boolean(publicClient) && configured && matchIds.length > 0,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Map<number, ResolverResult>> => {
      if (!publicClient) return new Map();
      const entries = await Promise.all(
        matchIds.map(async (id) => {
          try {
            const r = await publicClient.readContract({
              address: resolverContract.address,
              abi: resolverContract.abi,
              functionName: "results",
              args: [BigInt(id)],
            });
            return [
              id,
              {
                outcome: outcomeFromEnum(Number(r[0])),
                homeScore: Number(r[1]),
                awayScore: Number(r[2]),
                finalized: Boolean(r[4]),
              },
            ] as const;
          } catch {
            return [
              id,
              { outcome: null, homeScore: 0, awayScore: 0, finalized: false },
            ] as const;
          }
        }),
      );
      return new Map(entries);
    },
  });

  return data ?? new Map();
}
