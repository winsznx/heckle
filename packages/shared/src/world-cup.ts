/**
 * World Cup mode — proof the Heckle engine generalises past Zero Cup. The same
 * character → take → 0G receipt → reputation loop runs on any timed event; a
 * football fixture is just one `LiveEvent` adapter. Zero Cup stays the hero;
 * this is the "it works on real events too" wing.
 */
export interface LiveEventParticipant {
  name: string;
  country: string;
}

export interface LiveEvent {
  id: string;
  source: "zero-cup" | "world-cup";
  title: string;
  category: "tournament" | "football";
  startsAtISO: string;
  status: "upcoming" | "live" | "complete";
  participants: [LiveEventParticipant, LiveEventParticipant];
}

/** Marquee 2026 World Cup knockout ties — the fixtures the hecklers call. */
export const WORLD_CUP_FIXTURES: LiveEvent[] = [
  { id: "WC_1", source: "world-cup", title: "Round of 16", category: "football", startsAtISO: "2026-07-05T19:00:00Z", status: "upcoming", participants: [{ name: "Brazil", country: "BR" }, { name: "Argentina", country: "AR" }] },
  { id: "WC_2", source: "world-cup", title: "Round of 16", category: "football", startsAtISO: "2026-07-06T19:00:00Z", status: "upcoming", participants: [{ name: "France", country: "FR" }, { name: "England", country: "GB" }] },
  { id: "WC_3", source: "world-cup", title: "Round of 16", category: "football", startsAtISO: "2026-07-07T19:00:00Z", status: "upcoming", participants: [{ name: "Spain", country: "ES" }, { name: "Germany", country: "DE" }] },
  { id: "WC_4", source: "world-cup", title: "Round of 16", category: "football", startsAtISO: "2026-07-08T19:00:00Z", status: "upcoming", participants: [{ name: "Portugal", country: "PT" }, { name: "Netherlands", country: "NL" }] },
];

/** Registered on 0G mainnet (event id 3), The Pundit attached + calling. */
export const WORLD_CUP_EVENT_ID: number | null = 3;
