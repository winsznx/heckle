import { NextResponse } from "next/server";
import {
  buildWcMatchesUrl,
  parseWcMatchesResponse,
  upcomingKnockouts,
  recentResults,
  WC_SEASON,
  type WcFixture,
} from "@heckle/shared";

export const revalidate = 120;

interface WorldCupResponse {
  configured: boolean;
  upcoming: WcFixture[];
  recent: WcFixture[];
  season: number;
  requestsRemaining: number | null;
  error?: string;
}

export async function GET() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  const empty: WorldCupResponse = {
    configured: Boolean(token),
    upcoming: [],
    recent: [],
    season: WC_SEASON,
    requestsRemaining: null,
  };

  if (!token) return NextResponse.json(empty);

  try {
    // revalidate caps origin hits to ~1 / 2 min — comfortably under the free
    // tier's ~10 req/min — so users never trip the upstream rate limiter.
    const res = await fetch(buildWcMatchesUrl(WC_SEASON), {
      headers: { "X-Auth-Token": token },
      next: { revalidate },
    });
    const header = res.headers.get("X-Requests-Available-Minute");
    const requestsRemaining = header ? Number(header) : null;
    if (!res.ok) {
      return NextResponse.json({ ...empty, requestsRemaining, error: `feed ${res.status}` });
    }
    const fixtures = parseWcMatchesResponse(await res.json());
    return NextResponse.json({
      configured: true,
      upcoming: upcomingKnockouts(fixtures),
      recent: recentResults(fixtures, 6),
      season: WC_SEASON,
      requestsRemaining: Number.isFinite(requestsRemaining) ? requestsRemaining : null,
    } satisfies WorldCupResponse);
  } catch {
    return NextResponse.json({ ...empty, error: "feed_unreachable" });
  }
}
