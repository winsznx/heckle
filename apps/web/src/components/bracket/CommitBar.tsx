"use client";

import { useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, type Hex } from "viem";
import { ZG_MAINNET_ID } from "@heckle/shared";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { HashLink } from "@/components/HashLink";
import { bracketsContract, contractConfigured } from "@/lib/contracts";
import { heckleBracketsAbi } from "@/lib/abis";
import type { BracketPick } from "@/lib/bracket-state";

type Stage =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "signing"; root: Hex }
  | { phase: "confirming"; root: Hex; hash: Hex }
  | { phase: "error"; failed: "upload" | "commit"; message: string }
  | { phase: "done"; root: Hex; hash: Hex; bracketId: string };

interface CommitBarProps {
  eventId: number;
  predictionSet: BracketPick[];
  picked: number;
  totalCount: number;
  roundLabel: string;
  canCommit: boolean;
  champion: string | null;
  onClear: () => void;
}

export function CommitBar({
  eventId,
  predictionSet,
  picked,
  totalCount,
  roundLabel,
  canCommit,
  champion,
  onClear,
}: CommitBarProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [stage, setStage] = useState<Stage>({ phase: "idle" });

  const configured = contractConfigured(bracketsContract.address);
  const wrongNet = Boolean(address) && chainId !== ZG_MAINNET_ID;
  const busy =
    stage.phase === "uploading" ||
    stage.phase === "signing" ||
    stage.phase === "confirming";

  async function commit() {
    if (!canCommit || !address || !publicClient || !configured) return;

    let root: Hex;
    try {
      setStage({ phase: "uploading" });
      const res = await fetch("/api/upload-bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "BracketPredictionSet",
          eventId,
          submitter: address,
          picks: predictionSet,
          createdAt: Math.floor(Date.now() / 1000),
        }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status}).`);
      }
      const data: { root: Hex } = await res.json();
      root = data.root;
    } catch (err) {
      setStage({
        phase: "error",
        failed: "upload",
        message: err instanceof Error ? err.message : "Upload failed.",
      });
      return;
    }

    try {
      setStage({ phase: "signing", root });
      const hash = await writeContractAsync({
        address: bracketsContract.address,
        abi: heckleBracketsAbi,
        functionName: "commitBracket",
        args: [BigInt(eventId), root],
      });

      setStage({ phase: "confirming", root, hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let bracketId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: heckleBracketsAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "BracketCommitted") {
            bracketId = decoded.args.bracketId.toString();
            break;
          }
        } catch {
          continue;
        }
      }

      if (!bracketId) {
        throw new Error("Commit succeeded but BracketCommitted log was not found.");
      }

      setStage({ phase: "done", root, hash, bracketId });
    } catch (err) {
      setStage({
        phase: "error",
        failed: "commit",
        message: err instanceof Error ? err.message : "Commit failed.",
      });
    }
  }

  const label = !address
    ? "Connect wallet to commit"
    : wrongNet
      ? "Switch to 0G mainnet"
      : !configured
        ? "Brackets contract not configured"
        : !canCommit
          ? `Pick all ${totalCount} — ${picked}/${totalCount}`
          : busy
            ? "Committing…"
            : "Commit bracket on-chain";

  const primaryAction = wrongNet
    ? () => switchChain({ chainId: ZG_MAINNET_ID })
    : commit;
  const primaryDisabled = wrongNet
    ? false
    : !address || !configured || !canCommit || busy || stage.phase === "done";

  return (
    <div className="sticky bottom-0 z-30 border border-rule bg-paper shadow-lift p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wide opacity-60">
              Your bracket
            </span>
            <Pill tone={canCommit ? "filled" : "default"}>
              {picked}/{totalCount} {roundLabel}
            </Pill>
          </div>
          <span className="font-mono text-xs opacity-60 truncate">
            {champion ? `Champion pick · ${champion}` : "Later rounds optional"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {picked > 0 && stage.phase !== "done" ? (
            <Button variant="secondary" onClick={onClear} disabled={busy}>
              Reset
            </Button>
          ) : null}
          <Button onClick={primaryAction} disabled={primaryDisabled}>
            {stage.phase === "done" ? "Committed ✓" : label}
          </Button>
        </div>
      </div>

      {stage.phase === "error" ? (
        <div className="border border-rule bg-whisper p-3 flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wide">
            {stage.failed === "upload" ? "Storage step failed" : "Commit step failed"}
          </span>
          <p className="font-body text-sm">{stage.message}</p>
          <Button onClick={commit} disabled={busy}>
            Retry
          </Button>
        </div>
      ) : null}

      {busy ? (
        <div className="border border-rule bg-whisper p-3">
          <span className="font-mono text-xs uppercase tracking-wide">
            {stage.phase === "uploading"
              ? "1/2 · Storing prediction set on 0G Storage…"
              : stage.phase === "signing"
                ? "2/2 · Awaiting signature…"
                : "2/2 · Confirming on 0G mainnet…"}
          </span>
        </div>
      ) : null}

      {stage.phase === "done" ? (
        <div className="border border-rule bg-whisper p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Pill tone="filled">Committed ✓</Pill>
            <span className="font-mono text-xs opacity-70">Bracket #{stage.bracketId}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <HashLink type="storage_root" value={stage.root} label="Stored" />
            <HashLink type="tx_hash" value={stage.hash} label="Committed" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
