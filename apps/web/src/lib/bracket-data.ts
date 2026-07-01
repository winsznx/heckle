import {
  ZERO_CUP_R32_MATCHUPS,
  type ZeroCupBracket,
} from "@heckle/shared";
import { polar, type Point } from "./polar";

export const VIEWBOX = 1000;
const CENTER = VIEWBOX / 2;

export type Round = "R32" | "R16" | "QF" | "SF" | "Final";
export const ROUNDS: Round[] = ["R32", "R16", "QF", "SF", "Final"];

/** Ring radius per round join-point (outer → center). Contestants sit further
 *  out on CONTESTANT_RADIUS; each round's winner advances inward. */
export const RADIUS: Record<Round, number> = {
  R32: 356,
  R16: 258,
  QF: 168,
  SF: 88,
  Final: 0,
};

/** Where the 32 project circles sit, just outside the R32 join ring. */
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
  /** Human label, e.g. "R32 #1" (R32 nodes only). */
  label?: string;
  /** R32 only — source matchup + fixed contestants. */
  matchupId?: string;
  a?: string;
  b?: string;
  aCountry?: string;
  bCountry?: string;
  /** R32 only — the two project circles on the outer ring. */
  contestants?: [Contestant, Contestant];
  /** Inner rounds — the two feeder node ids whose winners contest this node. */
  feeders?: [string, string];
}

function meanAngle(a: number, b: number): number {
  return (a + b) / 2;
}

/**
 * Build the canonical 32-team single-elimination tree from the four
 * Zero Cup brackets (Companions / Games / Agents / Apps), each an 8-team
 * sub-bracket: 4 R32 matchups → 2 R16 → 1 QF (bracket champion), then two
 * SF pairings across brackets and a final.
 */
export function buildBracket(): BracketNode[] {
  const nodes: BracketNode[] = [];
  const byId = new Map<string, BracketNode>();

  const push = (n: BracketNode) => {
    nodes.push(n);
    byId.set(n.id, n);
  };

  // R32 — 16 matchups evenly spaced; each fans out to two project circles.
  ZERO_CUP_R32_MATCHUPS.forEach((m, i) => {
    const angle = i * (360 / ZERO_CUP_R32_MATCHUPS.length);
    const aAngle = angle - CONTESTANT_SPREAD;
    const bAngle = angle + CONTESTANT_SPREAD;
    push({
      id: m.id,
      round: "R32",
      angle,
      center: polar(CENTER, CENTER, RADIUS.R32, angle),
      radius: RADIUS.R32,
      bracket: m.bracket,
      label: m.label,
      matchupId: m.id,
      a: m.a.name,
      b: m.b.name,
      aCountry: m.a.country,
      bCountry: m.b.country,
      contestants: [
        {
          name: m.a.name,
          country: m.a.country,
          angle: aAngle,
          center: polar(CENTER, CENTER, CONTESTANT_RADIUS, aAngle),
        },
        {
          name: m.b.name,
          country: m.b.country,
          angle: bAngle,
          center: polar(CENTER, CENTER, CONTESTANT_RADIUS, bAngle),
        },
      ],
    });
  });

  const feederNode = (round: Round, id: string, feeders: [string, string]) => {
    const f0 = byId.get(feeders[0])!;
    const f1 = byId.get(feeders[1])!;
    const angle = meanAngle(f0.angle, f1.angle);
    push({
      id,
      round,
      angle,
      center: polar(CENTER, CENTER, RADIUS[round], angle),
      radius: RADIUS[round],
      bracket: f0.bracket,
      feeders,
    });
  };

  // R16 — pair adjacent R32 matchups (1&2, 3&4, …).
  for (let k = 0; k < 8; k++) {
    feederNode("R16", `R16_${k + 1}`, [
      `R32_${2 * k + 1}`,
      `R32_${2 * k + 2}`,
    ]);
  }

  // QF — one champion per bracket.
  for (let k = 0; k < 4; k++) {
    feederNode("QF", `QF_${k + 1}`, [`R16_${2 * k + 1}`, `R16_${2 * k + 2}`]);
  }

  // SF — Companions/Games and Agents/Apps.
  feederNode("SF", "SF_1", ["QF_1", "QF_2"]);
  feederNode("SF", "SF_2", ["QF_3", "QF_4"]);

  // Final — champion sits dead center.
  const final: BracketNode = {
    id: "F_1",
    round: "Final",
    angle: 0,
    center: { x: CENTER, y: CENTER },
    radius: 0,
    bracket: byId.get("SF_1")!.bracket,
    feeders: ["SF_1", "SF_2"],
  };
  push(final);

  return nodes;
}

export const BRACKET_NODES = buildBracket();
export const BRACKET_BY_ID = new Map(BRACKET_NODES.map((n) => [n.id, n]));
export const R32_NODES = BRACKET_NODES.filter((n) => n.round === "R32");
export const R32_COUNT = R32_NODES.length;
