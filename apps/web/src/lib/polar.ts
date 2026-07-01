export interface Point {
  x: number;
  y: number;
}

/**
 * Point on a circle, angle measured in degrees clockwise from 12 o'clock.
 * Works in the radial bracket's 0..VIEWBOX coordinate space.
 */
export function polar(cx: number, cy: number, radius: number, angleDeg: number): Point {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/** Percentage position (of a square container) for absolute HTML overlay nodes. */
export function toPercent(p: Point, viewbox: number): { left: string; top: string } {
  return { left: `${(p.x / viewbox) * 100}%`, top: `${(p.y / viewbox) * 100}%` };
}
