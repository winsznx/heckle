import { ethers } from "ethers";
import {
  decryptCore,
  encryptCore,
  publicKeyOf,
  randomDataKey,
  sealKeyTo,
  signAccessProof,
  signOwnershipProof,
  unsealKey,
} from "./crypto-inft.js";

/**
 * Offline proof of the ERC-7857 crypto checklist — no chain, no broadcast:
 *   1. owner decrypts the encrypted personality core
 *   2. transfer re-encrypts; the new owner decrypts
 *   3. the former owner CANNOT decrypt the re-encrypted payload
 *   4. access + ownership proof signatures recover to the expected signers
 *      (byte-for-byte with HeckleDataVerifier's on-chain recovery)
 *
 * Run: pnpm --filter @heckle/inference-agent exec tsx src/test-inft-crypto.ts
 */
function ok(cond: boolean, label: string): void {
  if (!cond) {
    console.error(`FAIL: ${label}`);
    process.exit(1);
  }
  console.log(`  ✓ ${label}`);
}

async function main(): Promise<void> {
  const alice = ethers.Wallet.createRandom(); // current owner
  const bob = ethers.Wallet.createRandom(); // buyer
  const oracle = ethers.Wallet.createRandom(); // Heckle TEE oracle

  const CORE = JSON.stringify({
    systemSeed: "You are The Pundit. Cold, technical, never hedges.",
    strategy: "Weight demo polish 2x; distrust late pivots.",
    memoryVersion: 4,
  });

  console.log("1) owner decrypts the encrypted core");
  const k1 = randomDataKey();
  const blob1 = encryptCore(CORE, k1);
  const sealedAlice = sealKeyTo(publicKeyOf(alice.privateKey), k1);
  const aliceKey = unsealKey(alice.privateKey, sealedAlice);
  ok(decryptCore(blob1, aliceKey) === CORE, "owner unseals key + decrypts core");

  console.log("2) transfer re-encrypts; new owner decrypts");
  const k2 = randomDataKey(); // oracle rotates the data key
  const blob2 = encryptCore(CORE, k2); // re-encrypted payload (new ciphertext)
  const sealedBob = sealKeyTo(publicKeyOf(bob.privateKey), k2);
  const bobKey = unsealKey(bob.privateKey, sealedBob);
  ok(decryptCore(blob2, bobKey) === CORE, "new owner unseals rotated key + decrypts");

  console.log("3) former owner CANNOT decrypt the re-encrypted payload");
  let oldOwnerBlocked = false;
  try {
    decryptCore(blob2, aliceKey); // alice's OLD key against the NEW ciphertext
  } catch {
    oldOwnerBlocked = true;
  }
  ok(oldOwnerBlocked, "old key fails AES-GCM auth on the new ciphertext");
  ok(unsealKey.length > 0 && decryptCore(blob1, aliceKey) === CORE, "old key still opens only the OLD blob (history)");

  console.log("4) proofs recover to expected signers (matches the contract)");
  const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(blob2)));
  const targetPubkey = "0x"; // empty => receiver's eth key
  const nonceA = ethers.hexlify(ethers.toUtf8Bytes("access-nonce-1"));
  const nonceO = ethers.hexlify(ethers.toUtf8Bytes("ownership-nonce-1"));
  const sealedKeyBytes = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(sealedBob)));

  const accessSig = await signAccessProof(bob, dataHash, targetPubkey, nonceA);
  const accessInner = ethers.keccak256(
    ethers.solidityPacked(["bytes32", "bytes", "bytes"], [dataHash, targetPubkey, nonceA]),
  );
  ok(
    ethers.verifyMessage(ethers.toBeHex(accessInner, 32), accessSig).toLowerCase() ===
      bob.address.toLowerCase(),
    "access proof recovers to the receiver",
  );

  const ownSig = await signOwnershipProof(oracle, dataHash, sealedKeyBytes, targetPubkey, nonceO);
  const ownInner = ethers.keccak256(
    ethers.solidityPacked(
      ["bytes32", "bytes", "bytes", "bytes"],
      [dataHash, sealedKeyBytes, targetPubkey, nonceO],
    ),
  );
  ok(
    ethers.verifyMessage(ethers.toBeHex(ownInner, 32), ownSig).toLowerCase() ===
      oracle.address.toLowerCase(),
    "ownership proof recovers to the oracle",
  );

  console.log("\nPASS — ERC-7857 crypto checklist verified offline.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
