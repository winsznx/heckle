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

/**
 * Official Round of 16 outcomes, from the Quarter-final draw (0g.ai/arena).
 * Keyed by the inner R16 node id ("R16_1"…"R16_8"), so they seed straight onto
 * the radial board and the Quarter-final ring resolves to the real pairings.
 * Heckle came through the Apps bracket (beat AURA in R16) into QF4 vs Turing Pits.
 */
export const ZERO_CUP_R16_RESULTS: Record<string, string> = {
  R16_1: "Soul",
  R16_2: "AskZero",
  R16_3: "Zegon",
  R16_4: "Zerun",
  R16_5: "4lpha AI",
  R16_6: "Civilization-0",
  R16_7: "Turing Pits",
  R16_8: "Heckle",
};

/**
 * Official Quarter-final outcomes, from the Semi-final draw (0g.ai/arena).
 * Keyed by the inner QF node id ("QF_1"…"QF_4"), so they seed straight onto the
 * radial board and the Semi-final ring resolves to the real pairings. Heckle
 * beat Turing Pits in QF4 and advanced to the Top 4 — SF2 vs 4lpha AI.
 */
export const ZERO_CUP_QF_RESULTS: Record<string, string> = {
  QF_1: "AskZero",
  QF_2: "Zerun",
  QF_3: "4lpha AI",
  QF_4: "Heckle",
};

/** Every settled node so far — R32, R16, and Quarter-final winners. */
export const ZERO_CUP_SETTLED: Record<string, string> = {
  ...ZERO_CUP_R32_RESULTS,
  ...ZERO_CUP_R16_RESULTS,
  ...ZERO_CUP_QF_RESULTS,
};

/** Reputation deltas (maybe.md scoring). */
export const REP_SCORING = {
  correct: 10,
  wrong: -3,
  upvote: 1,
  shared: 2,
} as const;

export type PredictionOutcome = "correct" | "wrong" | "pending";

/**
 * Grade a stored prediction against known results — every settled Zero Cup round
 * (R32 + R16). `pending` = the matchup has no result yet (e.g. the live QF).
 */
export function gradePrediction(
  matchupId: string,
  prediction: string | null | undefined,
): PredictionOutcome {
  const actual = ZERO_CUP_SETTLED[matchupId];
  if (!actual) return "pending";
  if (!prediction) return "pending";
  return prediction.trim().toLowerCase() === actual.toLowerCase()
    ? "correct"
    : "wrong";
}
