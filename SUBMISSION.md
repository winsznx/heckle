# Heckle — Zero Cup R32 Submission

**One-liner:** AI fan personalities you own as ERC-7857 INFTs — heckle live events with takes
logged to 0G Storage and reputation that travels with the character.

**Tagline:** *Personalities you own. Takes that live forever.*

- **Repo:** https://github.com/winsznx/heckle
- **Live demo:** https://tryheckle.xyz
- **Zero Cup bracket:** https://tryheckle.xyz/zero-cup
- **Demo video:** https://tryheckle.xyz/demovideo
- **Network:** 0G mainnet (chainId 16661)
- **Bracket standing:** Heckle is competing as **R32 #15 (Heckle vs Hanami)**.

## What it does

Pick a personality archetype, give them a name + a voice, mint them as an **ERC-7857 INFT** on 0G
mainnet (personality blob on 0G Storage). Attach the character to an event; an inference agent
generates in-character **takes** using **0G Compute (TEE-attested)**, stores each take on **0G
Storage**, and commits the storage root **on-chain**.

For the Round of 32 we made the tournament itself a Heckle event. **Three characters — The Pundit,
The Hater, The Optimist — each called all 16 R32 matchups: 48 TEE-attested predictions, on-chain,
with real disagreement.** Anyone can then build their own bracket on a radial canvas and **commit the
full prediction set on-chain** (the `HeckleBrackets` contract). Every take and every prediction is
independently re-verifiable.

## 0G primitives — all load-bearing (Rule 01)

| Primitive | Real work in Heckle |
|---|---|
| **0G Chain** | HeckleCharacters / HeckleEvents / HeckleTakes / HeckleBrackets — mints, attachments, take commitments, reputation, and user bracket commits. |
| **0G Compute** | TEE-attested inference per character; the response signature recovers to the provider's on-chain `teeSignerAddress`. Offline-reverifiable with `ethers.verifyMessage`. |
| **0G Storage** | Every take blob + personality blob + event metadata + bracket prediction-set, retrievable by Merkle root. |
| **ERC-7857 INFT** | The character itself — owned, transferable; history + reputation travel with the token. |

Strip any one and Heckle collapses: no Chain → nothing settles; no Compute → no attested takes; no
Storage → takes can't be replayed/audited; no INFT → characters aren't assets.

## Contract addresses (0G mainnet, chainId 16661)

| Contract | Address |
|---|---|
| HeckleCharacters (ERC-7857 INFT) | `0xfFB4A91Ff9C8dD16d9b0e0665d869392C8fCC0bc` |
| HeckleEvents | `0x30F9cF192A93C817d152606225a9C3DEC1d1B616` |
| HeckleTakes (+ reputation subsystem) | `0x06c2d42c2fA90897138ddeBa9f2Bc6CcF064d2BD` |
| HeckleBrackets (user prediction commits) | `0xa1139baE1bdC2FC94A400bc8097342dB0A0f3E6B` |

Reputation is a load-bearing subsystem inside `HeckleTakes` (`reputationOf`, `gradePrediction`), not a
separate deployment. Verify on https://chainscan.0g.ai. Per-user cost to commit a bracket: ~0.00076 0G.

## Demo proof points (no login needed)

- **Zero Cup radial bracket:** https://tryheckle.xyz/zero-cup — pick any matchup for the three hecklers' verified calls; build + commit your own bracket.
- **The Pundit profile:** https://tryheckle.xyz/characters/0 — 22 attested takes, each with a receipt row.
- **Verify a take:** https://tryheckle.xyz/storage/0xee27109152c63934180319a82f4af4264bd32cab156213f9619f20687d2f62a3 — `valid: true`; `recovered` = the on-chain TEE signer `0x2E79315804e7C8712afcEbF0E31F08174409D806`.
- **Grid view:** https://tryheckle.xyz/events/zero-cup-r32 — mobile-friendly matchup grid with vote splits.

## Stack

Next.js 16 / React 19 / Tailwind 4 (token-strict B&W) · wagmi 2 + RainbowKit 2 + viem 2 ·
Foundry (Solidity 0.8.24, cancun, OZ 5.0.2 — 4 contracts, 13 tests) · Node inference agent
(`@0gfoundation/0g-compute-ts-sdk`, `@0gfoundation/0g-storage-ts-sdk`, ethers v6).

## Demo script (~90s)

0:00 "AI personalities you own, that heckle live events on 0G." → homepage
0:08 The Pundit — 22 attested takes on-chain, receipts + Verified ✓
0:20 Click a receipt → /storage viewer: signature recovers to the on-chain TEE signer
0:35 Zero Cup radial bracket — 48 predictions, three voices, real disagreement (R32 #15: Heckle vs Hanami)
0:55 Build & commit your own bracket — picks advance the tree, commit unlocks at 16/16
1:15 Live on 0G mainnet — four contracts, 48 attested takes, real user commits, zero mocks
