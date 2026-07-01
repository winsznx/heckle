"use client";

import {
  BRACKET_NODES,
  BRACKET_BY_ID,
  R32_NODES,
  VIEWBOX,
  type BracketNode,
} from "@/lib/bracket-data";
import { type Picks } from "@/lib/bracket-state";
import { polar, toPercent } from "@/lib/polar";
import { flagEmoji } from "@/lib/format";

const CENTER = VIEWBOX / 2;

function short(name: string, n = 9): string {
  return name.length > n ? `${name.slice(0, n - 1)}…` : name;
}

interface Child {
  center: { x: number; y: number };
  angle: number;
  active: boolean;
}

/** The two entrants feeding a node, with whether each advanced past it. */
function childrenOf(parent: BracketNode, picks: Picks): Child[] {
  if (parent.round === "R32" && parent.contestants) {
    return parent.contestants.map((c) => ({
      center: c.center,
      angle: c.angle,
      active: picks[parent.id] === c.name,
    }));
  }
  const [f1, f2] = parent.feeders ?? ["", ""];
  return [f1, f2].map((fid) => {
    const f = BRACKET_BY_ID.get(fid);
    return {
      center: f?.center ?? { x: CENTER, y: CENTER },
      angle: f?.angle ?? 0,
      active: Boolean(picks[parent.id]) && picks[parent.id] === picks[fid],
    };
  });
}

function connectorPath(parent: BracketNode, child: Child): string {
  const { x: sx, y: sy } = child.center;
  if (parent.radius === 0) return `M ${sx} ${sy} L ${CENTER} ${CENTER}`;
  const m = polar(CENTER, CENTER, parent.radius, child.angle);
  return `M ${sx} ${sy} L ${m.x} ${m.y} L ${parent.center.x} ${parent.center.y}`;
}

const INNER_NODES = BRACKET_NODES.filter((n) => n.round !== "R32");

interface RadialBracketProps {
  picks: Picks;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPick: (nodeId: string, winner: string) => void;
  takeCount: (matchupId: string) => number;
}

export function RadialBracket({
  picks,
  selectedId,
  onSelect,
  onPick,
  takeCount,
}: RadialBracketProps) {
  const champion = picks["F_1"];

  return (
    <div className="w-full max-w-radial mx-auto">
      <div className="relative w-full aspect-square">
        <svg
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          {/* Base + active connectors. Dim until a pick advances along the path. */}
          {BRACKET_NODES.flatMap((parent) =>
            childrenOf(parent, picks).map((child, i) => (
              <path
                key={`${parent.id}-${i}`}
                d={connectorPath(parent, child)}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={
                  child.active
                    ? "fill-none stroke-ink opacity-90"
                    : "fill-none stroke-ink opacity-10"
                }
                strokeWidth={child.active ? 2.4 : 1}
              />
            )),
          )}

          {/* Join dots for the inner rounds. */}
          {INNER_NODES.filter((n) => n.round !== "Final").map((node) => (
            <circle
              key={`dot-${node.id}`}
              cx={node.center.x}
              cy={node.center.y}
              r={picks[node.id] ? 5 : 3.5}
              className={picks[node.id] ? "fill-ink stroke-ink" : "fill-paper stroke-ink opacity-30"}
              strokeWidth={1.5}
            />
          ))}

          {/* Center trophy. */}
          <g
            className={champion ? "stroke-ink fill-paper" : "stroke-ink fill-paper opacity-30"}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M481 480 H519 L513 500 Q500 509 487 500 Z" />
            <path d="M481 483 C470 483 470 496 484 498" className="fill-none" />
            <path d="M519 483 C530 483 530 496 516 498" className="fill-none" />
            <path d="M500 507 V517" className="fill-none" />
            <path d="M488 520 H512" className="fill-none" />
          </g>
        </svg>

        <div className="absolute inset-0">
          {/* 32 project circles. */}
          {R32_NODES.flatMap((node) => {
            const selected = selectedId === node.id;
            return (node.contestants ?? []).map((c) => {
              const picked = picks[node.id] === c.name;
              const showName = picked || selected;
              const pos = toPercent(c.center, VIEWBOX);
              return (
                <button
                  key={`${node.id}-${c.name}`}
                  type="button"
                  onClick={() => {
                    onPick(node.id, c.name);
                    onSelect(node.id);
                  }}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 hover:z-20"
                  style={{ left: pos.left, top: pos.top }}
                  title={c.name}
                >
                  <span
                    className={`grid place-items-center rounded-full w-9 h-9 text-base transition-all ${
                      picked
                        ? "border-2 border-ink bg-paper"
                        : selected
                          ? "border border-ink bg-paper"
                          : "border border-rule bg-paper opacity-40 group-hover:opacity-100"
                    }`}
                  >
                    {flagEmoji(c.country)}
                  </span>
                  <span
                    className={`absolute left-1/2 top-full -translate-x-1/2 mt-0.5 font-mono text-xs leading-none whitespace-nowrap bg-paper px-1 transition-opacity ${
                      picked ? "font-bold" : ""
                    } ${showName ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    {short(c.name, 12)}
                  </span>
                </button>
              );
            });
          })}

          {/* Inner-round winner labels + the champion under the trophy. */}
          {INNER_NODES.map((node) => {
            const winner = picks[node.id];
            if (!winner) return null;
            const isFinal = node.round === "Final";
            const anchor = isFinal
              ? { x: CENTER, y: CENTER + 34 }
              : node.center;
            const pos = toPercent(anchor, VIEWBOX);
            return (
              <button
                key={`label-${node.id}`}
                type="button"
                onClick={() => onSelect(node.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 font-mono text-xs font-bold leading-none whitespace-nowrap bg-paper px-1"
                style={{ left: pos.left, top: pos.top }}
              >
                {short(winner, isFinal ? 16 : 9)}
              </button>
            );
          })}

          {/* Selectable hit-target on each matchup's join point (opens takes). */}
          {R32_NODES.map((node) => {
            const pos = toPercent(node.center, VIEWBOX);
            const count = takeCount(node.matchupId ?? node.id);
            return (
              <button
                key={`sel-${node.id}`}
                type="button"
                onClick={() => onSelect(node.id)}
                aria-label={`${node.label} takes`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full w-5 h-5 grid place-items-center font-mono text-xs transition-opacity ${
                  selectedId === node.id ? "opacity-100" : "opacity-30 hover:opacity-100"
                }`}
                style={{ left: pos.left, top: pos.top }}
                title={`${node.label} · ${count} takes`}
              >
                <span className="w-2 h-2 rounded-full bg-ink" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
