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
  error?: string;
}

export async function GET() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  const empty: WorldCupResponse = {
    configured: Boolean(token),
    upcoming: [],
    recent: [],
    season: WC_SEASON,
  };

  if (!token) return NextResponse.json(empty);

  try {
    const res = await fetch(buildWcMatchesUrl(WC_SEASON), {
      headers: { "X-Auth-Token": token },
      next: { revalidate },
    });
    if (!res.ok) {
      return NextResponse.json({ ...empty, error: `feed ${res.status}` });
    }
    const fixtures = parseWcMatchesResponse(await res.json());
    return NextResponse.json({
      configured: true,
      upcoming: upcomingKnockouts(fixtures),
      recent: recentResults(fixtures, 6),
      season: WC_SEASON,
    } satisfies WorldCupResponse);
  } catch {
    return NextResponse.json({ ...empty, error: "feed_unreachable" });
  }
}
