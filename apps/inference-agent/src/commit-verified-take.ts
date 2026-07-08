import { ethers, type Wallet } from "ethers";
import { env } from "./env.js";
import { HECKLE_VERIFIED_TAKES_ABI, HECKLE_TAKES_ABI } from "./abis.js";

/** The attestation fields a take needs to be contract-verifiable. */
export interface Attestationish {
  signedText?: string;
  signature?: string;
  valid?: boolean;
}

export interface VerifiedCommitInput {
  characterId: bigint | number;
  eventId: bigint | number;
  matchupId?: string;
  takeRoot: string;
  kind: number;
  attestation: Attestationish | null | undefined;
}

export type CommitStatus = "committed" | "already" | "skipped-unverified";

export interface VerifiedCommitResult {
  status: CommitStatus;
  takeId?: bigint;
  txHash?: string;
  mirrorTxHash?: string;
}

/** Short human matchup ids encode as readable bytes32; longer ones hash. */
export function matchupToBytes32(id: string | undefined): string {
  if (!id) return ethers.ZeroHash;
  return id.length <= 31 ? ethers.encodeBytes32String(id) : ethers.id(id);
}

function isGateRevert(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /untrusted TEE signer|attestation already committed|root already committed/i.test(msg);
}

/**
 * Commit a take to HeckleVerifiedTakes — the authoritative, contract-verified
 * path. The contract is the sole gate: it recovers the 0G TEE signer from the
 * native EIP-191 signature and rejects anything not from a registered attestor.
 * Takes lacking a signature can't be verified and are skipped (they must not
 * count). When MIRROR_LEGACY_TAKES is set, ALSO mirror to the legacy HeckleTakes
 * for UI back-compat — but only AFTER the verified commit succeeds, never as the
 * authoritative path.
 */
export async function commitVerifiedTake(
  signer: Wallet,
  input: VerifiedCommitInput,
): Promise<VerifiedCommitResult> {
  const signedText = input.attestation?.signedText;
  const signature = input.attestation?.signature;
  if (!signedText || !signature) return { status: "skipped-unverified" };

  const verified = new ethers.Contract(env.HECKLE_VERIFIED_TAKES, HECKLE_VERIFIED_TAKES_ABI, signer);

  if (await verified.isRootVerified(input.takeRoot)) return { status: "already" };

  let receipt: ethers.TransactionReceipt | null;
  try {
    const tx = await verified.commitVerifiedTake(
      input.characterId,
      input.eventId,
      matchupToBytes32(input.matchupId),
      input.takeRoot,
      input.kind,
      signedText,
      signature,
    );
    receipt = await tx.wait();
  } catch (err) {
    if (isGateRevert(err)) return { status: "skipped-unverified" };
    throw err;
  }

  let takeId: bigint | undefined;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = verified.interface.parseLog(log);
      if (parsed?.name === "VerifiedTakeCommitted") {
        takeId = parsed.args.takeId as bigint;
        break;
      }
    } catch {
      /* not our event */
    }
  }

  let mirrorTxHash: string | undefined;
  if (env.MIRROR_LEGACY_TAKES && env.HECKLE_TAKES) {
    const legacy = new ethers.Contract(env.HECKLE_TAKES, HECKLE_TAKES_ABI, signer);
    const m = await legacy.commitTake(input.characterId, input.eventId, input.takeRoot, input.kind);
    mirrorTxHash = (await m.wait())?.hash;
  }

  return { status: "committed", takeId, txHash: receipt?.hash, mirrorTxHash };
}
