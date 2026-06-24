import type { ArchetypeId } from "@heckle/shared";
import { ARCHETYPE_IDS } from "@heckle/shared";

export interface CharacterMeta {
  archetype: number;
  handle: string;
  personalityRoot: `0x${string}`;
  creator: `0x${string}`;
  createdAt: bigint;
}

export interface Reputation {
  takesGenerated: bigint;
  votesReceived: bigint;
  predictionsCorrect: bigint;
  predictionsTotal: bigint;
  weightedScore: bigint;
  firstTakeAt: bigint;
  lastTakeAt: bigint;
}

export function archetypeIdFromIndex(index: number): ArchetypeId {
  return ARCHETYPE_IDS[index] ?? ARCHETYPE_IDS[0];
}

export function reputationIndex(rep: Reputation | null | undefined): number {
  if (!rep) return 0;
  return Number(rep.weightedScore);
}
