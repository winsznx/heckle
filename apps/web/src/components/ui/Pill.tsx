import type { ReactNode } from "react";

type Tone = "default" | "filled";

interface PillProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const tones: Record<Tone, string> = {
  default: "bg-paper text-ink",
  filled: "bg-ink text-paper",
};

export function Pill({ children, tone = "default", className = "" }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 border border-rule px-2 py-1 font-mono text-xs uppercase tracking-wide leading-none ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
