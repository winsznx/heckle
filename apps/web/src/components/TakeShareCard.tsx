"use client";

import { useState } from "react";
import { truncateAddr } from "@/lib/format";

const STATUS_LABEL: Record<"correct" | "wrong" | "pending", string> = {
  correct: "Called it ✓",
  wrong: "Missed",
  pending: "Pending",
};

interface TakeShareCardProps {
  takeId: string;
  character: string;
  matchup: string;
  prediction: string | null;
  confidence: number | null;
  text: string | null;
  takeRoot: string;
  txHash: string;
  status: "correct" | "wrong" | "pending";
}

/** A self-contained, screenshot-ready Proof of Take card + copy-link. */
export function TakeShareCard(props: TakeShareCardProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-2 border-ink bg-paper p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-black">Heckle</span>
          <span className="font-mono text-xs uppercase tracking-wide opacity-60">
            Proof of Take #{props.takeId}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wide opacity-50">
            {props.character} · {props.matchup}
          </span>
          {props.prediction ? (
            <span className="font-display text-lg font-black leading-none">
              {props.prediction}
              {props.confidence !== null ? (
                <span className="opacity-50"> · {props.confidence}%</span>
              ) : null}
            </span>
          ) : null}
        </div>

        {props.text ? (
          <blockquote className="font-display text-xl font-black leading-tight">
            &ldquo;{props.text}&rdquo;
          </blockquote>
        ) : null}

        <div className="border-t border-rule pt-3 flex flex-col gap-1 font-mono text-xs opacity-60">
          <span>Stored on 0G · {truncateAddr(props.takeRoot, 10, 6)}</span>
          {props.txHash ? (
            <span>Committed · {truncateAddr(props.txHash, 10, 6)}</span>
          ) : null}
          <span className="opacity-100 font-bold">
            {STATUS_LABEL[props.status]} — Stored before the result. Scored after reality.
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={copy}
        className="self-start border border-rule bg-ink text-paper px-4 py-2 font-mono text-xs uppercase tracking-wide hover:-translate-y-px transition-transform"
      >
        {copied ? "Link copied ✓" : "Share this take"}
      </button>
    </div>
  );
}
