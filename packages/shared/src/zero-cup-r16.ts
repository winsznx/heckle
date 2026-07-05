import type { ZeroCupMatchup } from "./zero-cup";

/**
 * Zero Cup Round of 16 — the 8 fixtures from the official draw (played Jul 4).
 * The 16 R32 winners, paired within their brackets. Names match our R32 data
 * (draw's "Mirrl"/"0G Sentinel"/"0G World" → "Mirri"/"OG Sentinel"/"OG World").
 * R16 takes live on the same Zero Cup event (id 2), keyed by these matchup ids.
 */
export const ZERO_CUP_R16_MATCHUPS: ZeroCupMatchup[] = [
  { id: "R16_1", label: "R16 #1", bracket: "Companions", a: { name: "Soul", country: "AT" }, b: { name: "Mirri", country: "NG" } },
  { id: "R16_2", label: "R16 #2", bracket: "Companions", a: { name: "AskZero", country: "NG" }, b: { name: "Knole", country: "IN" } },
  { id: "R16_3", label: "R16 #3", bracket: "Games", a: { name: "Zegon", country: "ID" }, b: { name: "Enigma", country: "IN" } },
  { id: "R16_4", label: "R16 #4", bracket: "Games", a: { name: "ZeroArena", country: "IN" }, b: { name: "Zerun", country: "PT" } },
  { id: "R16_5", label: "R16 #5", bracket: "Agents", a: { name: "Synapse", country: "IN" }, b: { name: "4lpha AI", country: "VN" } },
  { id: "R16_6", label: "R16 #6", bracket: "Agents", a: { name: "Galileo", country: "NG" }, b: { name: "Civilization-0", country: "NG" } },
  { id: "R16_7", label: "R16 #7", bracket: "Apps", a: { name: "Turing Pits", country: "IN" }, b: { name: "OG Sentinel", country: "NG" } },
  { id: "R16_8", label: "R16 #8", bracket: "Apps", a: { name: "Heckle", country: "NG" }, b: { name: "AURA", country: "ID" } },
];

export const ZERO_CUP_R16 = {
  title: "Zero Cup R16",
  caption: "8 matchups. 16 survivors. The hecklers call the next round.",
  resolutionSource: "0G Foundation R16 results announcement on @0G_Eco",
  matchups: ZERO_CUP_R16_MATCHUPS,
} as const;

/** Our fixture: Heckle vs AURA — Apps bracket, R16. */
export const HECKLE_VS_AURA_MATCHUP_ID = "R16_8";
