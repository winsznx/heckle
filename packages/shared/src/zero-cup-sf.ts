import type { ZeroCupMatchup } from "./zero-cup";

/**
 * Zero Cup Semi-finals — the 2 live fixtures (0g.ai/arena, Jul 12–15). The 4
 * Quarter-final winners, paired across brackets. Names match our data exactly so
 * a stored prediction string compares directly. SF takes live on the same Zero
 * Cup event (id 2), keyed by these matchup ids ("SF_1"/"SF_2"), which line up
 * with the radial board's SF nodes. Heckle is in SF2 (vs 4lpha AI).
 */
export const ZERO_CUP_SF_MATCHUPS: ZeroCupMatchup[] = [
  { id: "SF_1", label: "SF #1", bracket: "Companions", a: { name: "AskZero", country: "NG" }, b: { name: "Zerun", country: "PT" } },
  { id: "SF_2", label: "SF #2", bracket: "Agents", a: { name: "4lpha AI", country: "VN" }, b: { name: "Heckle", country: "NG" } },
];

export const ZERO_CUP_SF = {
  title: "Zero Cup Semi-finals",
  caption: "2 matchups. 4 contenders. The hecklers call the Final Four.",
  resolutionSource: "0G Foundation community vote on 0g.ai/arena",
  matchups: ZERO_CUP_SF_MATCHUPS,
} as const;

/** Our fixture: 4lpha AI vs Heckle — Agents×Apps cross-bracket, SF. */
export const HECKLE_SF_MATCHUP_ID = "SF_2";
