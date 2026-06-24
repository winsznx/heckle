/**
 * Eight monochrome character-card variants. The brand is pure black/white, so
 * palettes differ only in fill, inversion, and rule treatment — never in hue.
 * Values reference design tokens (var(--ink) etc.), never raw hex.
 */
export interface Palette {
  id: number;
  name: string;
  surface: string; // card background
  ink: string; // text + borders
  fill: string; // accent fill (header strip / chip)
  fillInk: string; // text on the fill
}

export const PALETTES: Palette[] = [
  { id: 1, name: "Paper", surface: "var(--paper)", ink: "var(--ink)", fill: "var(--ink)", fillInk: "var(--paper)" },
  { id: 2, name: "Ink", surface: "var(--ink)", ink: "var(--paper)", fill: "var(--paper)", fillInk: "var(--ink)" },
  { id: 3, name: "Whisper", surface: "var(--whisper)", ink: "var(--ink)", fill: "var(--ink)", fillInk: "var(--paper)" },
  { id: 4, name: "Masthead", surface: "var(--paper)", ink: "var(--ink)", fill: "var(--ink)", fillInk: "var(--paper)" },
  { id: 5, name: "Inverse Whisper", surface: "var(--ink)", ink: "var(--paper)", fill: "var(--whisper)", fillInk: "var(--ink)" },
  { id: 6, name: "Outline", surface: "var(--paper)", ink: "var(--ink)", fill: "var(--whisper)", fillInk: "var(--ink)" },
  { id: 7, name: "Heavy", surface: "var(--ink)", ink: "var(--paper)", fill: "var(--ink)", fillInk: "var(--paper)" },
  { id: 8, name: "Plain", surface: "var(--paper)", ink: "var(--ink)", fill: "var(--paper)", fillInk: "var(--ink)" },
];

export function palette(id: number): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
