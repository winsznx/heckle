"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { isAddress, type Hex } from "viem";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { HashLink } from "@/components/HashLink";
import { charactersContract } from "@/lib/contracts";
import { heckleCharactersAbi } from "@/lib/abis";

type Stage =
  | { phase: "idle" }
  | { phase: "signing" }
  | { phase: "confirming"; hash: Hex }
  | { phase: "error"; message: string }
  | { phase: "done"; hash: Hex };

/**
 * ERC-7857 transfer. Only the connected owner sees the controls. The whole
 * reputation-loaded asset — take history + record — moves with the token.
 */
export function TransferControls({
  tokenId,
  owner,
}: {
  tokenId: string;
  owner: string;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [to, setTo] = useState("");
  const [stage, setStage] = useState<Stage>({ phase: "idle" });

  const isOwner = Boolean(address) && address?.toLowerCase() === owner.toLowerCase();
  if (!isOwner) return null;

  const recipientValid = isAddress(to.trim());
  const busy = stage.phase === "signing" || stage.phase === "confirming";

  async function transfer() {
    if (!recipientValid || !address || !publicClient) return;
    try {
      setStage({ phase: "signing" });
      const hash = await writeContractAsync({
        address: charactersContract.address,
        abi: heckleCharactersAbi,
        functionName: "safeTransferFrom",
        args: [address, to.trim() as Hex, BigInt(tokenId)],
      });
      setStage({ phase: "confirming", hash });
      await publicClient.waitForTransactionReceipt({ hash });
      setStage({ phase: "done", hash });
    } catch (err) {
      setStage({
        phase: "error",
        message: err instanceof Error ? err.message : "Transfer failed.",
      });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-black">Transfer</h2>
      <Card className="p-6 flex flex-col gap-4">
        <p className="font-body opacity-80 max-w-prose">
          Send this character to another wallet. Ownership and the tokenId-keyed
          record — take history + earned reputation — move with the token. Exactly
          what transfers, and what stays public, is spelled out in{" "}
          <Link
            href="/transfer-guarantees"
            className="underline underline-offset-2 hover:opacity-100 transition-opacity"
          >
            Transfer guarantees
          </Link>
          .
        </p>
        {stage.phase === "done" ? (
          <div className="flex flex-col gap-2">
            <Pill tone="filled">Transferred ✓</Pill>
            <HashLink type="tx_hash" value={stage.hash} label="On-chain ·" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x… recipient address"
            />
            {stage.phase === "error" ? (
              <p className="font-body text-sm opacity-80">{stage.message}</p>
            ) : null}
            {busy ? (
              <span className="font-mono text-xs uppercase tracking-wide">
                {stage.phase === "signing"
                  ? "Awaiting signature…"
                  : "Confirming on 0G mainnet…"}
              </span>
            ) : null}
            <Button
              onClick={transfer}
              disabled={!recipientValid || busy}
              className="self-start"
            >
              {busy ? "Transferring…" : "Transfer character"}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
