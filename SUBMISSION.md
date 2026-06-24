# Heckle — Zero Cup Group Stage Submission

**One-liner:** AI fan personalities you own as ERC-7857 INFTs — heckle live events with takes
logged to 0G Storage and reputation that travels with the character.

**Tagline:** *Personalities you own. Takes that live forever.*

- **Repo:** https://github.com/<handle>/heckle
- **Live demo:** https://heckle.<domain>
- **Demo video (≤90s):** <link>
- **Network:** 0G mainnet (chainId 16661)

## What it does

Pick a personality archetype, give them a name + a voice, mint them as an **ERC-7857 INFT** on 0G
mainnet (personality blob on 0G Storage). Attach the character to a live event; an inference agent
generates in-character **takes** at each beat using **0G Compute (TEE-attested)**, stores each take
on **0G Storage**, and commits the storage root **on-chain**. After the event, predictions are graded
and **reputation** accrues to the INFT. The character — and its full take history + reputation — is
owned and transferable.

## 0G primitives — all load-bearing (Rule 01)

| Primitive | Real work in Heckle |
|---|---|
| **0G Chain** | HeckleCharacters / HeckleEvents / HeckleTakes — mints, attachments, take commitments, reputation. |
| **0G Compute** | TEE-attested inference per character per beat; response signature recovered against the on-chain TEE signer. |
| **0G Storage** | Every take blob + every personality blob + event metadata, retrievable by Merkle root. |
| **ERC-7857 INFT** | The character itself — owned, transferable; history + reputation travel with the token. |

Strip any one and Heckle collapses: no Chain → nothing settles; no Compute → no attested takes; no
Storage → takes can't be replayed/audited and characters can't carry history; no INFT → characters
aren't assets.

## Contract addresses (0G mainnet)

| Contract | Address |
|---|---|
| HeckleCharacters (ERC-7857 INFT) | `0xfFB4A91Ff9C8dD16d9b0e0665d869392C8fCC0bc` |
| HeckleEvents | `0x30F9cF192A93C817d152606225a9C3DEC1d1B616` |
| HeckleTakes (+ reputation) | `0x06c2d42c2fA90897138ddeBa9f2Bc6CcF064d2BD` |

Deployed on 0G mainnet (chainId 16661). Verify on https://chainscan.0g.ai

## Demo proof points (no login needed)

- The Pundit profile: `https://heckle.<domain>/characters/<demoTokenId>`
- Demo event timeline: `https://heckle.<domain>/events/1`
- Each take links to its live 0G Storage URI (returns the real blob).

## Stack

Next.js 16 / React 19 / Tailwind 4 (token-strict B&W) · wagmi 2 + RainbowKit 2 + viem 2 ·
Foundry (Solidity 0.8.24, cancun, OZ 5.0.2) · Node inference agent
(`@0gfoundation/0g-compute-ts-sdk`, `@0gfoundation/0g-storage-ts-sdk`, ethers v6).

## Build the demo (script — 90s)

0:00 "AI personalities you actually own." → The Pundit profile + take history (chainscan + Storage links)
0:25 Create a fresh heckler (Hater), name, brief, mint live (wallet tx + INFT)
0:50 Attach to the demo event, watch TEE-attested takes stream in; open one Storage URI to prove it's real
1:15 Post-event: prediction graded, reputation incremented on-chain
1:25 heckle.<domain> · github.com/<handle>/heckle
