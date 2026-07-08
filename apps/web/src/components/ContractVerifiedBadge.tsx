"use client";

import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { verifiedTakesContract } from "@/lib/contracts";
import { Pill } from "@/components/ui/Pill";
import { HashLink } from "@/components/HashLink";

/**
 * Reads HeckleVerifiedTakes.isRootVerified(root) on-chain and, when true, shows
 * that the take's TEE signature was recovered and accepted BY the contract —
 * the direct answer to "the signature is replayable but checked by no contract."
 * Uses the same usePublicClient + readContract path as the rest of the app.
 * Renders nothing until confirmed true, so it never implies false verification.
 */
export function ContractVerifiedBadge({ root }: { root: string }) {
  const publicClient = usePublicClient();

  const { data: isVerified } = useQuery({
    queryKey: ["root-verified", root],
    enabled: Boolean(publicClient) && root.startsWith("0x"),
    // The 0G RPC is intermittently TLS-flaky; keep retrying so a transient
    // failure never permanently hides a genuinely verified take.
    retry: 5,
    refetchInterval: (q) => (q.state.data === true ? false : 10000),
    staleTime: 60000,
    queryFn: async (): Promise<boolean> => {
      if (!publicClient) return false;
      return (await publicClient.readContract({
        address: verifiedTakesContract.address,
        abi: verifiedTakesContract.abi,
        functionName: "isRootVerified",
        args: [root as `0x${string}`],
      })) as boolean;
    },
  });

  if (isVerified !== true) return null;

  return (
    <div className="flex flex-col gap-2 border border-rule bg-whisper p-4">
      <Pill tone="filled">Contract-verified on-chain ✓</Pill>
      <p className="font-body text-sm opacity-80">
        HeckleVerifiedTakes recovered this response&rsquo;s 0G TEE signer on-chain and
        confirmed it against the registered attestor set. The signature isn&rsquo;t just
        replayable in your browser — it is checked by a contract before the take counts.
      </p>
      <HashLink
        type="address"
        value={verifiedTakesContract.address}
        label="On HeckleVerifiedTakes ·"
      />
    </div>
  );
}
