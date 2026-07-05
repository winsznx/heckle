import { useCallback, useEffect, useMemo, useState } from "react";
import type { BracketDef } from "./bracket-data";

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
  def: BracketDef,
): [string | null, string | null] {
  const node = def.byId.get(nodeId);
  if (!node) return [null, null];
  if (!node.feeders) return [node.a ?? null, node.b ?? null];
  const [f0, f1] = node.feeders;
  return [picks[f0] ?? null, picks[f1] ?? null];
}

/**
 * Drop any pick no longer valid given upstream picks. Processed outer→inner so
 * each inner node resolves against already-settled feeders — re-picking a
 * winner cascades: stale downstream advances fall away instead of lingering.
 */
function prune(picks: Picks, def: BracketDef): Picks {
  const next: Picks = {};
  for (const round of def.rounds) {
    for (const node of def.nodes) {
      if (node.round !== round) continue;
      const chosen = picks[node.id];
      if (!chosen) continue;
      const [a, b] = contestantsOf(node.id, next, def);
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
  outerCount: number;
  canCommit: boolean;
  champion: string | null;
  predictionSet: BracketPick[];
  hydrated: boolean;
}

export function useBracketState(
  eventId: number | null,
  def: BracketDef,
): BracketState {
  const key = eventId === null ? null : `${STORAGE_PREFIX}${eventId}:${def.outerRound}`;
  const [picks, setPicks] = useState<Picks>({});
  const [hydrated, setHydrated] = useState(false);

  // Client-only read of the persisted bracket (localStorage is unavailable in
  // SSR, so this can't be a render-time derived value).
  useEffect(() => {
    if (!key) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setPicks(prune(JSON.parse(raw) as Picks, def));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, [key, def]);

  // Persist after hydration so the empty initial state never clobbers storage.
  useEffect(() => {
    if (!key || !hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(picks));
    } catch {
      /* ignore quota/availability errors */
    }
  }, [key, hydrated, picks]);

  const pick = useCallback(
    (nodeId: string, winner: string) => {
      setPicks((prev) => {
        const next = { ...prev };
        if (next[nodeId] === winner) delete next[nodeId];
        else next[nodeId] = winner;
        return prune(next, def);
      });
    },
    [def],
  );

  const clear = useCallback(() => setPicks({}), []);

  const contestants = useCallback(
    (nodeId: string) => contestantsOf(nodeId, picks, def),
    [picks, def],
  );

  const outerPicked = useMemo(
    () =>
      def.nodes.filter((n) => n.round === def.outerRound && picks[n.id]).length,
    [picks, def],
  );

  const predictionSet = useMemo<BracketPick[]>(
    () =>
      def.nodes
        .filter((n) => picks[n.id])
        .map((n) => ({ matchupId: n.id, winner: picks[n.id] })),
    [picks, def],
  );

  return {
    picks,
    pick,
    clear,
    contestants,
    outerCount: outerPicked,
    canCommit: outerPicked === def.outerCount,
    champion: picks[def.finalId] ?? null,
    predictionSet,
    hydrated,
  };
}
