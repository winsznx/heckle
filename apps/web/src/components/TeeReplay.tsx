"use client";

import { useState } from "react";
import { recoverMessageAddress, type Hex } from "viem";
import { Pill } from "@/components/ui/Pill";

type Phase = "idle" | "recovering" | "done" | "error";

/**
 * Re-derives the TEE signer from the signed text + signature entirely in the
 * viewer's browser (viem `recoverMessageAddress`, EIP-191) and checks it against
 * the on-chain TEE signer. Zero trust in Heckle — the proof runs client-side.
 */
export function TeeReplay({
  signedText,
  signature,
  signer,
}: {
  signedText: string;
  signature: string;
  signer: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [recovered, setRecovered] = useState<string | null>(null);

  async function replay() {
    setPhase("recovering");
    setRecovered(null);
    try {
      await new Promise((r) => setTimeout(r, 450));
      const addr = await recoverMessageAddress({
        message: signedText,
        signature: signature as Hex,
      });
      setRecovered(addr);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }

  const match =
    recovered !== null &&
    signer !== "" &&
    recovered.toLowerCase() === signer.toLowerCase();

  return (
    <div className="flex flex-col gap-3 border border-rule bg-whisper p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-wide">
          Verify in your browser
        </span>
        <button
          type="button"
          onClick={replay}
          disabled={phase === "recovering"}
          className="border border-rule bg-ink text-paper px-3 py-1 font-mono text-xs uppercase tracking-wide hover:-translate-y-px transition-transform disabled:opacity-50"
        >
          {phase === "recovering"
            ? "Recovering…"
            : phase === "done"
              ? "Replay again"
              : "Replay verification"}
        </button>
      </div>

      {phase !== "idle" ? (
        <div className="flex flex-col gap-2 font-mono text-xs">
          <span className="opacity-50">
            recoverMessageAddress(signedText, signature)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="opacity-50">→</span>
            <span className="break-all">
              {phase === "recovering" ? "…recovering signer" : recovered ?? "—"}
            </span>
          </div>
          {phase === "done" ? (
            match ? (
              <Pill tone="filled">Matches on-chain TEE signer ✓</Pill>
            ) : (
              <Pill>Does not match ✗</Pill>
            )
          ) : null}
          {phase === "error" ? (
            <span className="opacity-70">Recovery failed — malformed signature.</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
