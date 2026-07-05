"use client";

import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  votesContract,
  charactersContract,
  contractConfigured,
} from "@/lib/contracts";

/**
 * Sqrt-weighted upvote on a take. Votes as the connected wallet's first
 * character; hidden entirely until HeckleVotes is deployed (address ZERO).
 */
export function VoteButton({ takeId }: { takeId: string }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const configured = contractConfigured(votesContract.address);

  const { data: votes, refetch } = useReadContract({
    address: votesContract.address,
    abi: votesContract.abi,
    functionName: "votesOf",
    args: [BigInt(takeId)],
    query: { enabled: configured },
  });

  const { data: charId } = useQuery({
    queryKey: ["my-first-char", address],
    enabled: Boolean(publicClient && address) && configured,
    queryFn: async (): Promise<bigint | null> => {
      if (!publicClient || !address) return null;
      const logs = await publicClient.getLogs({
        address: charactersContract.address,
        event: charactersContract.abi[0],
        args: { owner: address },
        fromBlock: 36996000n,
        toBlock: "latest",
      });
      const id = logs[0]?.args?.tokenId;
      return typeof id === "bigint" ? id : null;
    },
  });

  if (!configured) return null;

  const voteCount = typeof votes === "bigint" ? Number(votes) : 0;
  const canVote = Boolean(address && charId) && !busy;
  const title = !address
    ? "Connect a wallet to vote"
    : !charId
      ? "Mint a character to vote"
      : "Upvote — weight scales with your character's reputation";

  async function vote() {
    if (!charId || !publicClient) return;
    setBusy(true);
    try {
      const hash = await writeContractAsync({
        address: votesContract.address,
        abi: votesContract.abi,
        functionName: "voteTake",
        args: [BigInt(takeId), charId],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch {
      /* rejected or already voted */
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={vote}
      disabled={!canVote}
      title={title}
      className="inline-flex items-center gap-1 border border-rule bg-paper px-2 py-1 font-mono text-xs uppercase tracking-wide hover:bg-whisper transition-colors disabled:opacity-50"
    >
      ▲ {voteCount}
      {busy ? " …" : ""}
    </button>
  );
}
