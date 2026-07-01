export interface ZeroCupContestant {
  name: string;
  /**
   * 2-letter country code, rendered in mono. The B&W brand has no room for
   * colour flag emoji, so the country is shown as a code (NG, AT, IN, …).
   * Best-effort from the Arena bracket; override if any are wrong.
   */
  country: string;
}

export type ZeroCupBracket = "Companions" | "Games" | "Agents" | "Apps";

export interface ZeroCupMatchup {
  id: string; // "R32_1" … "R32_16"
  label: string; // "R32 #1"
  bracket: ZeroCupBracket;
  a: ZeroCupContestant;
  b: ZeroCupContestant;
  /** Canned outcome, filled when R32 results announce (Jul 3). */
  winner?: string;
}

export const ZERO_CUP_R32_MATCHUPS: ZeroCupMatchup[] = [
  { id: "R32_1", label: "R32 #1", bracket: "Companions", a: { name: "GoalGhost", country: "NG" }, b: { name: "Soul", country: "AT" } },
  { id: "R32_2", label: "R32 #2", bracket: "Companions", a: { name: "Mirri", country: "NG" }, b: { name: "Chum AI", country: "NG" } },
  { id: "R32_3", label: "R32 #3", bracket: "Companions", a: { name: "Stash", country: "NG" }, b: { name: "AskZero", country: "NG" } },
  { id: "R32_4", label: "R32 #4", bracket: "Companions", a: { name: "DanfoAI", country: "NG" }, b: { name: "Knole", country: "IN" } },
  { id: "R32_5", label: "R32 #5", bracket: "Games", a: { name: "Aether", country: "NG" }, b: { name: "Zegon", country: "ID" } },
  { id: "R32_6", label: "R32 #6", bracket: "Games", a: { name: "OGWorldCup", country: "ID" }, b: { name: "Enigma", country: "IN" } },
  { id: "R32_7", label: "R32 #7", bracket: "Games", a: { name: "ZeroArena", country: "IN" }, b: { name: "Engram", country: "MX" } },
  { id: "R32_8", label: "R32 #8", bracket: "Games", a: { name: "Gaffer", country: "AT" }, b: { name: "Zerun", country: "PT" } },
  { id: "R32_9", label: "R32 #9", bracket: "Agents", a: { name: "Sworn", country: "NG" }, b: { name: "Synapse", country: "IN" } },
  { id: "R32_10", label: "R32 #10", bracket: "Agents", a: { name: "IMSY", country: "IN" }, b: { name: "4lpha AI", country: "VN" } },
  { id: "R32_11", label: "R32 #11", bracket: "Agents", a: { name: "Galileo", country: "NG" }, b: { name: "Grimoire", country: "IT" } },
  { id: "R32_12", label: "R32 #12", bracket: "Agents", a: { name: "Bonfire", country: "IN" }, b: { name: "Civilization-0", country: "NG" } },
  { id: "R32_13", label: "R32 #13", bracket: "Apps", a: { name: "OG World", country: "US" }, b: { name: "Turing Pits", country: "IN" } },
  { id: "R32_14", label: "R32 #14", bracket: "Apps", a: { name: "CredLayer", country: "GH" }, b: { name: "OG Sentinel", country: "NG" } },
  { id: "R32_15", label: "R32 #15", bracket: "Apps", a: { name: "Heckle", country: "NG" }, b: { name: "Hanami", country: "JP" } },
  { id: "R32_16", label: "R32 #16", bracket: "Apps", a: { name: "AURA", country: "ID" }, b: { name: "ZERO//BREACH", country: "NG" } },
];

export const ZERO_CUP_R32 = {
  title: "Zero Cup R32",
  caption: "16 matchups. 32 builders. Heckle characters predict the bracket.",
  resolutionSource: "0G Foundation R32 results announcement on @0G_Eco",
  startsAtISO: "2026-06-30T10:00:00Z",
  endsAtISO: "2026-07-03T23:59:59Z",
  matchups: ZERO_CUP_R32_MATCHUPS,
} as const;

/** Registered on 0G mainnet (Wave B). */
export const ZERO_CUP_R32_EVENT_ID: number | null = 2;
export const ZERO_CUP_R32_EVENT_ROOT: string | null =
  "0xe6abb23ef9383a2cf389a6da431f1b3561bea87bceba19e33cb864ed48858eb1";
