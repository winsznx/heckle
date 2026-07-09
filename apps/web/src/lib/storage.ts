import { storageUri } from "@heckle/shared";

export interface PersonalityBlob {
  name?: string;
  handle?: string;
  archetype?: string;
  personalityBrief?: string;
  palette?: number;
  /** 0G Storage root of the character's portrait image, if one was uploaded. */
  imageRoot?: string;
  createdAt?: number;
  creator?: string;
  [key: string]: unknown;
}

export interface InferenceAttestation {
  chatId?: string;
  /** Canonical text the provider signed: sha256(req):sha256(resp)[:...]. */
  signedText?: string;
  /** 65-byte ECDSA signature (EIP-191). Present only on the verified pipeline. */
  signature?: string;
  /** Expected on-chain TEE signer. */
  signer?: string;
  /** Address recovered locally from signedText + signature. */
  recovered?: string;
  valid?: boolean;
}

export interface InferenceMeta {
  /** 0G Compute provider — the TEE node that ran the inference. */
  provider?: string;
  /** Model that produced the take (bound into the signed request hash). */
  model?: string;
  temperature?: number;
  /** Attestation type, e.g. "TeeML". */
  verifiability?: string;
  usage?: { prompt?: number; completion?: number; total?: number } | null;
}

export interface TakeBlob {
  text?: string;
  kind?: string;
  characterId?: string;
  eventId?: string;
  triggerId?: string;
  matchupId?: string;
  prediction?: string;
  /** Legacy: bare model string. Prefer `inference.model` on new takes. */
  model?: string;
  /** Full inference provenance recorded so a reader can see how it reasoned. */
  inference?: InferenceMeta;
  triggeringEvent?: { label?: string; timestamp?: number };
  inferenceAttestation?: InferenceAttestation | null;
  createdAt?: number;
  [key: string]: unknown;
}

/**
 * Version discriminator: a take is from the verified pipeline iff its blob carries
 * a signature. Legacy blobs (pre-attestation-fix) have no signature and are
 * orphaned — never surfaced. Future new-pipeline takes that fail verification
 * still carry a signature, so they remain visible (to render "Verification pending").
 */
export function hasVerifiedAttestation(blob: TakeBlob | null | undefined): boolean {
  const sig = blob?.inferenceAttestation?.signature;
  return typeof sig === "string" && sig.length > 0;
}

export async function fetchBlob<T = unknown>(root: string): Promise<T | null> {
  if (!root || root === "0x" + "0".repeat(64)) return null;
  try {
    // Blobs are content-addressed by Merkle root, so they're immutable — cache
    // hard. This turns the events page's periodic refetch and cross-page reads
    // of the same roots into instant cache hits instead of fresh downloads.
    const res = await fetch(storageUri(root), { cache: "force-cache" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
