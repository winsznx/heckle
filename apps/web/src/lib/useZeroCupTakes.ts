import { useMemo } from "react";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { archetype } from "@heckle/shared";
import {
  charactersContract,
  takesContract,
  verifiedTakesContract,
  inftContract,
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
  /** Off-chain: the stored attestation carries a signature (replayable). */
  verified: boolean;
  /** On-chain: committed to HeckleVerifiedTakes — the contract recovered and
   *  accepted the 0G TEE signer. Strictly stronger than `verified`. */
  contractVerified: boolean;
  /** The TEE signer the contract recovered, when contractVerified. */
  onchainSigner: string | null;
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
      // The take LIST is the union of two on-chain sources, deduped by storage
      // root: the legacy HeckleTakes log (original R32 / R16 / World-Cup takes)
      // and the verified-only HeckleVerifiedTakes log (the knockout rounds —
      // QF / SF — are committed verified-only, so they live only here). Both
      // queries are best-effort; neither may gate the other.
      const [legacyLogs, verifiedLogs] = await Promise.all([
        publicClient
          .getLogs({
            address: takesContract.address,
            event: takesContract.abi[0],
            args: { eventId: BigInt(eventId) },
            fromBlock: FROM_BLOCK,
            toBlock: "latest",
          })
          .catch(() => []),
        publicClient
          .getLogs({
            address: verifiedTakesContract.address,
            event: verifiedTakesContract.abi[0],
            args: { eventId: BigInt(eventId) },
            fromBlock: FROM_BLOCK,
            toBlock: "latest",
          })
          .catch(() => []),
      ]);

      // takeRoot -> on-chain TEE signer, so a take can be marked contract-verified.
      const verifiedByRoot = new Map<string, string>();
      for (const vl of verifiedLogs) {
        const root = vl.args.takeRoot;
        const signer = vl.args.signer;
        if (typeof root === "string" && typeof signer === "string") {
          verifiedByRoot.set(root.toLowerCase(), signer);
        }
      }

      interface RawTake {
        takeId: bigint;
        characterId: bigint;
        kind: number;
        ts: bigint;
        root: `0x${string}`;
        txHash: string;
      }
      const byRoot = new Map<string, RawTake>();
      const add = (
        takeId: unknown,
        characterId: unknown,
        kind: unknown,
        ts: unknown,
        root: unknown,
        txHash: string,
      ) => {
        if (
          typeof takeId !== "bigint" ||
          typeof characterId !== "bigint" ||
          typeof kind !== "number" ||
          typeof ts !== "bigint" ||
          typeof root !== "string"
        ) {
          return;
        }
        const key = root.toLowerCase();
        if (!byRoot.has(key)) {
          byRoot.set(key, { takeId, characterId, kind, ts, root: root as `0x${string}`, txHash });
        }
      };
      for (const log of legacyLogs) {
        add(log.args.takeId, log.args.characterId, log.args.kind, log.args.timestamp, log.args.takeRoot, String(log.transactionHash ?? ""));
      }
      for (const log of verifiedLogs) {
        add(log.args.takeId, log.args.characterId, log.args.kind, log.args.timestamp, log.args.takeRoot, String(log.transactionHash ?? ""));
      }

      const out = await Promise.all(
        [...byRoot.values()].map(async (r) => {
          const blob = await fetchBlob<TakeBlob>(r.root);
          if (!hasVerifiedAttestation(blob)) return null;
          return {
            takeId: r.takeId.toString(),
            matchupId: typeof blob?.matchupId === "string" ? blob.matchupId : "",
            prediction:
              typeof blob?.prediction === "string" ? blob.prediction : null,
            characterId: r.characterId.toString(),
            kind: r.kind,
            timestamp: r.ts,
            takeRoot: r.root,
            txHash: r.txHash,
            verified: blob?.inferenceAttestation?.valid === true,
            contractVerified: verifiedByRoot.has(r.root.toLowerCase()),
            onchainSigner: verifiedByRoot.get(r.root.toLowerCase()) ?? null,
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
      const EMPTY_ROOT = /^0x0*$/;
      await Promise.all(
        ids.map(async (cid) => {
          // Legacy V1 characters carry their name in a personality blob. The new
          // ERC-7857 hecklers (5/6/7) are INFT-only and store the name on-chain.
          // Try V1 first, then fall back to the INFT identity.
          try {
            const meta = await publicClient.readContract({
              address: charactersContract.address,
              abi: charactersContract.abi,
              functionName: "characterOf",
              args: [BigInt(cid)],
            });
            if (EMPTY_ROOT.test(meta.personalityRoot)) throw new Error("no v1 character");
            const pblob = await fetchBlob<PersonalityBlob>(meta.personalityRoot);
            charMap.set(cid, {
              name: pblob?.name ?? `Heckler #${cid}`,
              archetypeLabel: archetype(archetypeIdFromIndex(meta.archetype)).label,
            });
            return;
          } catch {
            /* fall through to the INFT identity */
          }
          try {
            const meta = await publicClient.readContract({
              address: inftContract.address,
              abi: inftContract.abi,
              functionName: "characterOf",
              args: [BigInt(cid)],
            });
            charMap.set(cid, {
              name: meta.name || `Heckler #${cid}`,
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
