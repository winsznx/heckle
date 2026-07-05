/**
 * Official Zero Cup R32 outcomes, from the R16 Fixture List draw.
 * Winner names match `ZERO_CUP_R32_MATCHUPS` exactly so a stored prediction
 * string compares directly. Draw spellings ("Mirrl", "0G Sentinel") are
 * normalised to our data's names ("Mirri", "OG Sentinel").
 */
export const ZERO_CUP_R32_RESULTS: Record<string, string> = {
  R32_1: "Soul",
  R32_2: "Mirri",
  R32_3: "AskZero",
  R32_4: "Knole",
  R32_5: "Zegon",
  R32_6: "Enigma",
  R32_7: "ZeroArena",
  R32_8: "Zerun",
  R32_9: "Synapse",
  R32_10: "4lpha AI",
  R32_11: "Galileo",
  R32_12: "Civilization-0",
  R32_13: "Turing Pits",
  R32_14: "OG Sentinel",
  R32_15: "Heckle",
  R32_16: "AURA",
};

/** Reputation deltas (maybe.md scoring). */
export const REP_SCORING = {
  correct: 10,
  wrong: -3,
  upvote: 1,
  shared: 2,
} as const;

export type PredictionOutcome = "correct" | "wrong" | "pending";

/** Grade a stored prediction against known results. `pending` = no result yet. */
export function gradePrediction(
  matchupId: string,
  prediction: string | null | undefined,
): PredictionOutcome {
  const actual = ZERO_CUP_R32_RESULTS[matchupId];
  if (!actual) return "pending";
  if (!prediction) return "pending";
  return prediction.trim().toLowerCase() === actual.toLowerCase()
    ? "correct"
    : "wrong";
}
