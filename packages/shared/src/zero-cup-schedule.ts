/**
 * Zero Cup 2026 tournament shape — the official Road-to-the-Cup, schedule, and
 * prize pool (0g.ai/arena). Group → Final runs Jun 15 → Jul 19; the group stage
 * through R16 is judged, the knockouts (QF/SF/Final) are decided by community
 * vote. Prizes stack as a project advances.
 */

export type StageKind = "open" | "judged" | "vote";

export interface CupStage {
  key: string;
  name: string;
  window: string;
  kind: StageKind;
  field: string;
  detail: string;
}

export const ZERO_CUP_STAGES: CupStage[] = [
  { key: "submit", name: "Project Submission", window: "Jun 15", kind: "open", field: "Open entry", detail: "Anyone can enter — build on 0G and submit before the deadline." },
  { key: "group", name: "Group Stage", window: "Jun 15–27", kind: "judged", field: "Top 32", detail: "Every project is reviewed; judges select the Top 32." },
  { key: "r32", name: "Round of 32", window: "Jun 28–Jul 3", kind: "judged", field: "Top 16", detail: "The tournament begins — the best 16 advance." },
  { key: "r16", name: "Round of 16", window: "Jul 4–8", kind: "judged", field: "Top 8", detail: "The final judged round — the Top 8 reach the knockouts." },
  { key: "qf", name: "Quarter Finals", window: "Jul 9–12", kind: "vote", field: "Top 8", detail: "Community voting decides who moves on. $500 guaranteed per project." },
  { key: "sf", name: "Semi Finals", window: "Jul 12–15", kind: "vote", field: "Top 4", detail: "Public voting picks the finalists. +$1,000 per project." },
  { key: "final", name: "Final", window: "Jul 16–19", kind: "vote", field: "Top 2", detail: "The community crowns the champion. +$2,000 per project." },
  { key: "champion", name: "Champion", window: "Jul 19", kind: "open", field: "1 winner", detail: "Lift the Zero Cup and claim the +$5,000 grand prize." },
] as const;

export interface PrizeTier {
  tier: string;
  amount: string;
  note: string;
}

export const ZERO_CUP_PRIZES: PrizeTier[] = [
  { tier: "Top 8 projects", amount: "$500", note: "guaranteed, per project" },
  { tier: "Top 4 projects", amount: "+$1,000", note: "additional, per project" },
  { tier: "Top 2 projects", amount: "+$2,000", note: "additional, per project" },
  { tier: "Zero Cup Champion", amount: "+$5,000", note: "grand prize" },
] as const;

/** Total prize pool, and what a single project can stack all the way to the top. */
export const ZERO_CUP_PRIZE_POOL = "$17,000";
export const ZERO_CUP_CHAMPION_TOTAL = "$8,500";

/** Which round Heckle is currently in. Bump as the tournament advances. */
export const ZERO_CUP_CURRENT_STAGE = "r16";
