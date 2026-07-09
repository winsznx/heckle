export interface Point {
  x: number;
  y: number;
}

/**
 * Point on a circle, angle measured in degrees clockwise from 12 o'clock.
 * Works in the radial bracket's 0..VIEWBOX coordinate space.
 *
 * Coordinates are rounded to 3 decimals (sub-pixel on the 1000-unit viewbox):
 * Math.sin/Math.cos differ in their last ULP between the Node SSR engine and
 * the browser, and that difference lands verbatim in SVG path/circle attributes
 * and trips React hydration. Rounding well above the trig noise floor makes both
 * sides emit byte-identical strings.
 */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function polar(cx: number, cy: number, radius: number, angleDeg: number): Point {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: round3(cx + radius * Math.cos(rad)),
    y: round3(cy + radius * Math.sin(rad)),
  };
}

/**
 * Percentage position (of a square container) for absolute HTML overlay nodes.
 * Fixed to 4 decimals so SSR and client emit byte-identical strings — full
 * float precision serialises differently on the server and trips React
 * hydration. 4dp is sub-pixel on the 1000-unit viewbox.
 */
export function toPercent(p: Point, viewbox: number): { left: string; top: string } {
  const pct = (v: number) => `${((v / viewbox) * 100).toFixed(4)}%`;
  return { left: pct(p.x), top: pct(p.y) };
}
