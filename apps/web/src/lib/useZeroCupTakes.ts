import { useMemo } from "react";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { archetype } from "@heckle/shared";
import {
  charactersContract,
  takesContract,
  contractConfigured,
} from "./contracts";
import {
  fetchBlob,
  hasVerifiedAttestation,
  type PersonalityBlob,
  type TakeBlob,
} from "./storage";
import { archetypeIdFromIndex } from "./characters";

export interface MatchTake {
  takeId: string;
  matchupId: string;
  prediction: string | null;
  characterId: string;
  characterName?: string;
  archetypeLabel?: string;
  kind: number;
  timestamp: bigint;
  takeRoot: `0x${string}`;
  txHash: string;
  verified: boolean;
  text: string | null;
}

const FROM_BLOCK = 36996000n;

/**
 * Verified, deduped Zero Cup takes for an event, grouped by matchup. Shared by
 * the grid view and the radial bracket so both read one source of truth:
 * signature-carrying takes only, latest take per (character, matchup).
 */
export function useZeroCupTakes(eventId: number | null): {
  takes: MatchTake[] | undefined;
  byMatchup: Map<string, MatchTake[]>;
} {
  const publicClient = usePublicClient();
  const configured = contractConfigured(takesContract.address);

  const { data: takes } = useQuery({
    queryKey: ["zero-cup-takes", eventId],
    enabled: Boolean(publicClient) && configured && eventId !== null,
    refetchInterval: 8000,
    queryFn: async (): Promise<MatchTake[]> => {
      if (!publicClient || eventId === null) return [];
      const logs = await publicClient.getLogs({
        address: takesContract.address,
        event: takesContract.abi[0],
        args: { eventId: BigInt(eventId) },
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
      });

      const out = await Promise.all(
        logs.map(async (log) => {
          const takeId = log.args.takeId;
          const characterId = log.args.characterId;
          const kind = log.args.kind;
          const ts = log.args.timestamp;
          const root = log.args.takeRoot;
          if (
            typeof takeId !== "bigint" ||
            typeof characterId !== "bigint" ||
            typeof kind !== "number" ||
            typeof ts !== "bigint" ||
            typeof root !== "string"
          ) {
            return null;
          }
          const blob = await fetchBlob<TakeBlob>(root);
          if (!hasVerifiedAttestation(blob)) return null;
          return {
            takeId: takeId.toString(),
            matchupId: typeof blob?.matchupId === "string" ? blob.matchupId : "",
            prediction:
              typeof blob?.prediction === "string" ? blob.prediction : null,
            characterId: characterId.toString(),
            kind,
            timestamp: ts,
            takeRoot: root as `0x${string}`,
            txHash: String(log.transactionHash ?? ""),
            verified: blob?.inferenceAttestation?.valid === true,
            text: blob?.text ?? null,
          } satisfies MatchTake;
        }),
      );

      const valid = out.filter((t): t is MatchTake => t !== null);

      // Latest take per (character, matchup) — clean regenerations supersede
      // earlier takes on the append-only contract, and keep counts at 1/char.
      const latest = new Map<string, MatchTake>();
      for (const t of valid) {
        const dedupeKey = `${t.characterId}:${t.matchupId}`;
        const prev = latest.get(dedupeKey);
        if (!prev || BigInt(t.takeId) > BigInt(prev.takeId)) latest.set(dedupeKey, t);
      }
      const deduped = Array.from(latest.values());

      const ids = Array.from(new Set(deduped.map((t) => t.characterId)));
      const charMap = new Map<string, { name: string; archetypeLabel: string }>();
      await Promise.all(
        ids.map(async (cid) => {
          try {
            const meta = await publicClient.readContract({
              address: charactersContract.address,
              abi: charactersContract.abi,
              functionName: "characterOf",
              args: [BigInt(cid)],
            });
            const pblob = await fetchBlob<PersonalityBlob>(meta.personalityRoot);
            charMap.set(cid, {
              name: pblob?.name ?? `Heckler #${cid}`,
              archetypeLabel: archetype(archetypeIdFromIndex(meta.archetype)).label,
            });
          } catch {
            /* skip unresolved */
          }
        }),
      );
      for (const t of deduped) {
        const c = charMap.get(t.characterId);
        if (c) {
          t.characterName = c.name;
          t.archetypeLabel = c.archetypeLabel;
        }
      }
      return deduped;
    },
  });

  const byMatchup = useMemo(() => {
    const map = new Map<string, MatchTake[]>();
    for (const t of takes ?? []) {
      const arr = map.get(t.matchupId) ?? [];
      arr.push(t);
      map.set(t.matchupId, arr);
    }
    return map;
  }, [takes]);

  return { takes, byMatchup };
}
