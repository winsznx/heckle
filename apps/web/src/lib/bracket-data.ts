import {
  ZERO_CUP_R32_MATCHUPS,
  ZERO_CUP_R16_MATCHUPS,
  type ZeroCupBracket,
  type ZeroCupMatchup,
} from "@heckle/shared";
import { polar, type Point } from "./polar";

export const VIEWBOX = 1000;
const CENTER = VIEWBOX / 2;

export type Round = "R32" | "R16" | "QF" | "SF" | "Final";
export const ROUNDS: Round[] = ["R32", "R16", "QF", "SF", "Final"];

/** Where the outer project circles sit, just beyond the first join ring. */
export const CONTESTANT_RADIUS = 452;
/** Angular half-spread of a matchup's two contestants around its center angle. */
const CONTESTANT_SPREAD = 5.6;

export interface Contestant {
  name: string;
  country: string;
  angle: number;
  center: Point;
}

export interface BracketNode {
  id: string;
  round: Round;
  /** Layout angle (deg clockwise from 12 o'clock). */
  angle: number;
  center: Point;
  radius: number;
  bracket: ZeroCupBracket;
  /** Human label, e.g. "R32 #1" (outer round only). */
  label?: string;
  /** Outer round only — source matchup + fixed contestants. */
  matchupId?: string;
  a?: string;
  b?: string;
  aCountry?: string;
  bCountry?: string;
  /** Outer round only — the two project circles on the outer ring. */
  contestants?: [Contestant, Contestant];
  /** Inner rounds — the two feeder node ids whose winners contest this node. */
  feeders?: [string, string];
}

export interface BracketDef {
  nodes: BracketNode[];
  byId: Map<string, BracketNode>;
  outerNodes: BracketNode[];
  rounds: Round[];
  outerRound: Round;
  finalId: string;
  outerCount: number;
  /** Join-ring radii for the guide circles (excludes the 0-radius final). */
  ringRadii: number[];
}

function meanAngle(a: number, b: number): number {
  return (a + b) / 2;
}

/**
 * Generic single-elimination radial tree from a power-of-two set of matchups.
 * `rounds[0]` is the outer round (carries the contestant circles); each later
 * round pairs adjacent nodes inward to a single final at the centre. Used for
 * both the R32 draw (16 matchups) and the R16 draw (8 matchups).
 */
export function buildBracketDef(
  matchups: ZeroCupMatchup[],
  rounds: Round[],
  radiusByRound: Partial<Record<Round, number>>,
  contestantRadius: number,
): BracketDef {
  const nodes: BracketNode[] = [];
  const byId = new Map<string, BracketNode>();
  const push = (n: BracketNode) => {
    nodes.push(n);
    byId.set(n.id, n);
  };
  const rOf = (round: Round) => radiusByRound[round] ?? 0;

  const outerRound = rounds[0];
  matchups.forEach((m, i) => {
    const angle = i * (360 / matchups.length);
    const aAngle = angle - CONTESTANT_SPREAD;
    const bAngle = angle + CONTESTANT_SPREAD;
    push({
      id: m.id,
      round: outerRound,
      angle,
      center: polar(CENTER, CENTER, rOf(outerRound), angle),
      radius: rOf(outerRound),
      bracket: m.bracket,
      label: m.label,
      matchupId: m.id,
      a: m.a.name,
      b: m.b.name,
      aCountry: m.a.country,
      bCountry: m.b.country,
      contestants: [
        { name: m.a.name, country: m.a.country, angle: aAngle, center: polar(CENTER, CENTER, contestantRadius, aAngle) },
        { name: m.b.name, country: m.b.country, angle: bAngle, center: polar(CENTER, CENTER, contestantRadius, bAngle) },
      ],
    });
  });

  let prev = matchups.map((m) => m.id);
  for (let level = 1; level < rounds.length; level++) {
    const round = rounds[level];
    const ids: string[] = [];
    for (let k = 0; k < prev.length / 2; k++) {
      const feeders: [string, string] = [prev[2 * k], prev[2 * k + 1]];
      const f0 = byId.get(feeders[0])!;
      const f1 = byId.get(feeders[1])!;
      const angle = meanAngle(f0.angle, f1.angle);
      const id = round === "Final" ? "F_1" : `${round}_${k + 1}`;
      push({
        id,
        round,
        angle,
        center: round === "Final" ? { x: CENTER, y: CENTER } : polar(CENTER, CENTER, rOf(round), angle),
        radius: rOf(round),
        bracket: f0.bracket,
        feeders,
      });
      ids.push(id);
    }
    prev = ids;
  }

  return {
    nodes,
    byId,
    outerNodes: nodes.filter((n) => n.round === outerRound),
    rounds,
    outerRound,
    finalId: prev[0] ?? "F_1",
    outerCount: matchups.length,
    ringRadii: rounds.map(rOf).filter((r) => r > 0),
  };
}

/** R32 draw — 16 matchups. Radii kept exactly as the shipped layout. */
export const R32_DEF = buildBracketDef(
  ZERO_CUP_R32_MATCHUPS,
  ["R32", "R16", "QF", "SF", "Final"],
  { R32: 356, R16: 258, QF: 168, SF: 88, Final: 0 },
  CONTESTANT_RADIUS,
);

/** R16 draw — 8 matchups, one fewer ring; outer join pushed to the R32 radius. */
export const R16_DEF = buildBracketDef(
  ZERO_CUP_R16_MATCHUPS,
  ["R16", "QF", "SF", "Final"],
  { R16: 356, QF: 250, SF: 150, Final: 0 },
  CONTESTANT_RADIUS,
);

// Backward-compatible R32 aliases.
export const RADIUS: Record<Round, number> = { R32: 356, R16: 258, QF: 168, SF: 88, Final: 0 };
export const BRACKET_NODES = R32_DEF.nodes;
export const BRACKET_BY_ID = R32_DEF.byId;
export const R32_NODES = R32_DEF.outerNodes;
export const R32_COUNT = R32_DEF.outerCount;
