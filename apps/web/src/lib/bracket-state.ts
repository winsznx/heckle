import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BRACKET_BY_ID,
  BRACKET_NODES,
  R32_COUNT,
  ROUNDS,
} from "./bracket-data";

export type Picks = Record<string, string>;

export interface BracketPick {
  matchupId: string;
  winner: string;
}

const STORAGE_PREFIX = "heckle:bracket:";

/** The two contestants contesting a node, resolved against current picks. */
export function contestantsOf(
  nodeId: string,
  picks: Picks,
): [string | null, string | null] {
  const node = BRACKET_BY_ID.get(nodeId);
  if (!node) return [null, null];
  if (node.round === "R32") return [node.a ?? null, node.b ?? null];
  const [f0, f1] = node.feeders ?? ["", ""];
  return [picks[f0] ?? null, picks[f1] ?? null];
}

/**
 * Drop any pick no longer valid given upstream picks. Processed outer→inner so
 * each inner node resolves against already-settled feeders — re-picking an R32
 * winner cascades: stale downstream advances fall away instead of lingering.
 */
function prune(picks: Picks): Picks {
  const next: Picks = {};
  for (const round of ROUNDS) {
    for (const node of BRACKET_NODES) {
      if (node.round !== round) continue;
      const chosen = picks[node.id];
      if (!chosen) continue;
      const [a, b] = contestantsOf(node.id, next);
      if (chosen === a || chosen === b) next[node.id] = chosen;
    }
  }
  return next;
}

export interface BracketState {
  picks: Picks;
  pick: (nodeId: string, winner: string) => void;
  clear: () => void;
  contestants: (nodeId: string) => [string | null, string | null];
  r32Count: number;
  canCommit: boolean;
  champion: string | null;
  predictionSet: BracketPick[];
  hydrated: boolean;
}

export function useBracketState(eventId: number | null): BracketState {
  const key = eventId === null ? null : `${STORAGE_PREFIX}${eventId}`;
  const [picks, setPicks] = useState<Picks>({});
  const [hydrated, setHydrated] = useState(false);

  // Client-only read of the persisted bracket (localStorage is unavailable in
  // SSR, so this can't be a render-time derived value).
  useEffect(() => {
    if (!key) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setPicks(prune(JSON.parse(raw) as Picks));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, [key]);

  // Persist after hydration so the empty initial state never clobbers storage.
  useEffect(() => {
    if (!key || !hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(picks));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [key, hydrated, picks]);

  const pick = useCallback((nodeId: string, winner: string) => {
    setPicks((prev) => {
      const next = { ...prev };
      if (next[nodeId] === winner) delete next[nodeId];
      else next[nodeId] = winner;
      return prune(next);
    });
  }, []);

  const clear = useCallback(() => setPicks({}), []);

  const contestants = useCallback(
    (nodeId: string) => contestantsOf(nodeId, picks),
    [picks],
  );

  const r32Count = useMemo(
    () =>
      BRACKET_NODES.filter((n) => n.round === "R32" && picks[n.id]).length,
    [picks],
  );

  const predictionSet = useMemo<BracketPick[]>(
    () =>
      BRACKET_NODES.filter((n) => picks[n.id]).map((n) => ({
        matchupId: n.id,
        winner: picks[n.id],
      })),
    [picks],
  );

  return {
    picks,
    pick,
    clear,
    contestants,
    r32Count,
    canCommit: r32Count === R32_COUNT,
    champion: picks["F_1"] ?? null,
    predictionSet,
    hydrated,
  };
}
