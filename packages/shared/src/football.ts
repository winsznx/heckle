/**
 * football-data.org (v4) client for World Cup mode. The real fixture + result
 * feed behind /events/world-cup. The token is server-side only — the web app
 * fetches through its /api/worldcup route, and the inference agent fetches
 * directly; both normalise through the helpers here so the shape is one source
 * of truth. Outcomes map onto the on-chain HeckleResolver enum.
 */
export const FOOTBALL_API_BASE = "https://api.football-data.org/v4";
export const WC_COMPETITION_CODE = "WC";
export const WC_SEASON = 2026;

export type WcOutcome = "HOME" | "AWAY" | "DRAW";

/** Mirrors HeckleResolver.Outcome (UNRESOLVED = 0). */
export const WC_OUTCOME_ENUM: Record<WcOutcome, number> = {
  HOME: 1,
  AWAY: 2,
  DRAW: 3,
};

export const WC_KNOCKOUT_STAGES = [
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
] as const;

const STAGE_LABELS: Record<string, string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-final",
  SEMI_FINALS: "Semi-final",
  THIRD_PLACE: "Third place",
  FINAL: "Final",
  GROUP_STAGE: "Group stage",
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage.replace(/_/g, " ").toLowerCase();
}

export interface WcTeam {
  name: string;
  tla: string | null;
}

export interface WcFixture {
  matchId: number;
  stage: string;
  utcDate: string;
  status: string;
  home: WcTeam;
  away: WcTeam;
  score: { home: number | null; away: number | null; outcome: WcOutcome | null };
  finished: boolean;
  hasTeams: boolean;
}

interface RawTeam {
  name?: string | null;
  tla?: string | null;
}

interface RawMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam?: RawTeam | null;
  awayTeam?: RawTeam | null;
  score?: {
    winner?: string | null;
    fullTime?: { home?: number | null; away?: number | null } | null;
  } | null;
}

function outcomeFromWinner(winner?: string | null): WcOutcome | null {
  if (winner === "HOME_TEAM") return "HOME";
  if (winner === "AWAY_TEAM") return "AWAY";
  if (winner === "DRAW") return "DRAW";
  return null;
}

export function normalizeMatch(m: RawMatch): WcFixture {
  const home: WcTeam = { name: m.homeTeam?.name ?? "TBD", tla: m.homeTeam?.tla ?? null };
  const away: WcTeam = { name: m.awayTeam?.name ?? "TBD", tla: m.awayTeam?.tla ?? null };
  return {
    matchId: m.id,
    stage: m.stage,
    utcDate: m.utcDate,
    status: m.status,
    home,
    away,
    score: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
      outcome: outcomeFromWinner(m.score?.winner),
    },
    finished: m.status === "FINISHED",
    hasTeams: Boolean(m.homeTeam?.name && m.awayTeam?.name),
  };
}

export function buildWcMatchesUrl(season: number = WC_SEASON): string {
  return `${FOOTBALL_API_BASE}/competitions/${WC_COMPETITION_CODE}/matches?season=${season}`;
}

/** Normalise a raw /matches response body into fixtures. */
export function parseWcMatchesResponse(data: unknown): WcFixture[] {
  const matches = (data as { matches?: RawMatch[] } | null)?.matches ?? [];
  return matches.map(normalizeMatch);
}

export interface WcFeedResult {
  fixtures: WcFixture[];
  /** football-data.org throttling headroom this minute (null if not reported). */
  requestsRemaining: number | null;
}

/**
 * Direct fetch for the inference agent (Node) that surfaces the rate-limit
 * headroom. football-data.org throttles the free tier hard (~10 req/min); the
 * `X-Requests-Available-Minute` header tells us how much is left so callers can
 * back off before they get blocked. The web app uses its own route (with Next
 * revalidate caching) rather than this.
 */
export async function fetchWcFixturesMeta(
  token: string,
  season: number = WC_SEASON,
): Promise<WcFeedResult> {
  const res = await fetch(buildWcMatchesUrl(season), {
    headers: { "X-Auth-Token": token },
  });
  const header = res.headers.get("X-Requests-Available-Minute");
  const requestsRemaining = header !== null && header !== "" ? Number(header) : null;
  if (!res.ok) throw new Error(`football-data ${res.status}`);
  const data = (await res.json()) as { matches?: RawMatch[] };
  return {
    fixtures: (data.matches ?? []).map(normalizeMatch),
    requestsRemaining: Number.isFinite(requestsRemaining) ? requestsRemaining : null,
  };
}

/** Convenience wrapper when the rate-limit headroom isn't needed. */
export async function fetchWcFixtures(
  token: string,
  season: number = WC_SEASON,
): Promise<WcFixture[]> {
  return (await fetchWcFixturesMeta(token, season)).fixtures;
}

/** Upcoming knockout fixtures with known teams — the ones a character can call. */
export function upcomingKnockouts(fixtures: WcFixture[]): WcFixture[] {
  return fixtures
    .filter(
      (f) =>
        !f.finished &&
        f.hasTeams &&
        (WC_KNOCKOUT_STAGES as readonly string[]).includes(f.stage),
    )
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
}

/** Most-recent finished knockout results, newest first. */
export function recentResults(fixtures: WcFixture[], limit = 6): WcFixture[] {
  return fixtures
    .filter(
      (f) => f.finished && (WC_KNOCKOUT_STAGES as readonly string[]).includes(f.stage),
    )
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, limit);
}
