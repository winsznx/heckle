import type { ZeroCupMatchup } from "./zero-cup";

/**
 * Zero Cup Quarter-finals — the 4 live fixtures (0g.ai/arena, Jul 9–12). The 8
 * R16 winners, paired within their brackets. Names match our data exactly so a
 * stored prediction string compares directly. QF takes live on the same Zero Cup
 * event (id 2), keyed by these matchup ids ("QF_1"…"QF_4"), which line up with
 * the radial board's QF nodes. Heckle is in QF4 (Apps) vs Turing Pits.
 */
export const ZERO_CUP_QF_MATCHUPS: ZeroCupMatchup[] = [
  { id: "QF_1", label: "QF #1", bracket: "Companions", a: { name: "Soul", country: "AT" }, b: { name: "AskZero", country: "NG" } },
  { id: "QF_2", label: "QF #2", bracket: "Games", a: { name: "Zegon", country: "ID" }, b: { name: "Zerun", country: "PT" } },
  { id: "QF_3", label: "QF #3", bracket: "Agents", a: { name: "4lpha AI", country: "VN" }, b: { name: "Civilization-0", country: "NG" } },
  { id: "QF_4", label: "QF #4", bracket: "Apps", a: { name: "Turing Pits", country: "IN" }, b: { name: "Heckle", country: "NG" } },
];

export const ZERO_CUP_QF = {
  title: "Zero Cup Quarter-finals",
  caption: "4 matchups. 8 contenders. The hecklers call the knockouts.",
  resolutionSource: "0G Foundation community vote on 0g.ai/arena",
  matchups: ZERO_CUP_QF_MATCHUPS,
} as const;

/** Our fixture: Turing Pits vs Heckle — Apps bracket, QF. */
export const HECKLE_QF_MATCHUP_ID = "QF_4";
