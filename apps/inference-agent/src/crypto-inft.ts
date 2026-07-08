import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { ethers } from "ethers";

/**
 * ERC-7857 personality-core crypto for Heckle INFTs. Dependency-free hybrid
 * encryption:
 *   - the private core is encrypted with a random 256-bit data key (AES-256-GCM)
 *   - the data key is "sealed" to a recipient's secp256k1 public key via an
 *     ephemeral-ECDH + HKDF + AES-256-GCM box
 * On transfer the oracle rotates the data key and re-encrypts the core, so a
 * former owner's key cannot open the new ciphertext.
 */

const CURVE = "secp256k1";
const SEAL_INFO = Buffer.from("heckle-inft-seal-v1");

export interface CipherBlob {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  ct: string;
  tag: string;
}

export interface SealedKey {
  v: 1;
  ephPub: string; // uncompressed ephemeral public key (hex)
  iv: string;
  ct: string;
  tag: string;
}

/** Uncompressed secp256k1 public key (0x04…) for an Ethereum private key. */
export function publicKeyOf(privateKey: string): string {
  return ethers.SigningKey.computePublicKey(privateKey, false);
}

export function randomDataKey(): Buffer {
  return randomBytes(32);
}

export function encryptCore(plaintext: string, dataKey: Buffer): CipherBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("hex"),
    ct: ct.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptCore(blob: CipherBlob, dataKey: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", dataKey, Buffer.from(blob.iv, "hex"));
  decipher.setAuthTag(Buffer.from(blob.tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(blob.ct, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

function deriveAesKey(shared: Buffer): Buffer {
  return Buffer.from(hkdfSync("sha256", shared, Buffer.alloc(0), SEAL_INFO, 32));
}

/** Seal a data key to a recipient's uncompressed public key. */
export function sealKeyTo(recipientPubKey: string, dataKey: Buffer): SealedKey {
  const eph = createECDH(CURVE);
  eph.generateKeys();
  const shared = eph.computeSecret(Buffer.from(recipientPubKey.replace(/^0x/, ""), "hex"));
  const aesKey = deriveAesKey(shared);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  const ct = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  return {
    v: 1,
    ephPub: eph.getPublicKey().toString("hex"),
    iv: iv.toString("hex"),
    ct: ct.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

/** Unseal a data key with the recipient's private key. */
export function unsealKey(recipientPrivateKey: string, sealed: SealedKey): Buffer {
  const ecdh = createECDH(CURVE);
  ecdh.setPrivateKey(Buffer.from(recipientPrivateKey.replace(/^0x/, ""), "hex"));
  const shared = ecdh.computeSecret(Buffer.from(sealed.ephPub, "hex"));
  const aesKey = deriveAesKey(shared);
  const decipher = createDecipheriv("aes-256-gcm", aesKey, Buffer.from(sealed.iv, "hex"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(sealed.ct, "hex")), decipher.final()]);
}

// Each dynamic field is hashed independently before packing so adjacent bytes
// can't be re-sliced — mirrors HeckleDataVerifier byte-for-byte.
function accessInner(dataHash: string, targetPubkey: string, nonce: string): string {
  return ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes32"],
      [dataHash, ethers.keccak256(targetPubkey), ethers.keccak256(nonce)],
    ),
  );
}

function ownershipInner(
  dataHash: string,
  newDataHash: string,
  sealedKey: string,
  targetPubkey: string,
  nonce: string,
): string {
  return ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32"],
      [
        dataHash,
        newDataHash,
        ethers.keccak256(sealedKey),
        ethers.keccak256(targetPubkey),
        ethers.keccak256(nonce),
      ],
    ),
  );
}

/** Anything that can EIP-191 personal_sign (ethers Wallet, HDNodeWallet, Signer). */
export interface MessageSigner {
  signMessage(message: string | Uint8Array): Promise<string>;
}

/**
 * Sign over the 66-char hex string of `inner`. `signMessage(string)` applies
 * EIP-191 personal_sign to the UTF-8 bytes, matching the contract's
 * keccak256("\x19Ethereum Signed Message:\n66" + toHexString(inner,32)).
 */
function signInner(signer: MessageSigner, inner: string): Promise<string> {
  return signer.signMessage(ethers.toBeHex(inner, 32));
}

/** Receiver-consent (access) signature — signed by the receiver or their delegate. */
export function signAccessProof(
  receiver: MessageSigner,
  dataHash: string,
  targetPubkey: string,
  nonce: string,
): Promise<string> {
  return signInner(receiver, accessInner(dataHash, targetPubkey, nonce));
}

/** Oracle attestation that the data key was re-sealed to the receiver.
 *  `dataHash` is the token's current (old) commitment; `newDataHash` is the
 *  re-encrypted payload the transfer rotates to. */
export function signOwnershipProof(
  oracle: MessageSigner,
  dataHash: string,
  newDataHash: string,
  sealedKey: string,
  targetPubkey: string,
  nonce: string,
): Promise<string> {
  return signInner(oracle, ownershipInner(dataHash, newDataHash, sealedKey, targetPubkey, nonce));
}
