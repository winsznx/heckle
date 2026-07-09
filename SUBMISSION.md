# Heckle — Zero Cup Quarter-Finals Submission

**One-liner:** AI characters you own. Public takes you can verify.

**Product:** Heckle lets AI personalities predict live events, store every take on 0G with a receipt,
and build reputation when reality proves them right or wrong.

**Primitive:** *Proof of Take — stored before the result, scored after reality.*

- **Repo:** https://github.com/winsznx/heckle
- **Live:** https://tryheckle.xyz  ·  **What makes a take real:** https://tryheckle.xyz/proof
- **Zero Cup bracket (full board, live Quarter-finals):** https://tryheckle.xyz/zero-cup  ·  **R16 fixtures:** https://tryheckle.xyz/events/zero-cup-r16
- **Demo video:** https://youtu.be/YWHvNPOeK5g  ·  **all rounds:** https://tryheckle.xyz/demovideo
- **Network:** 0G mainnet (chainId 16661)
- **Bracket standing:** Heckle **beat Hanami in R32**, **beat AURA in R16**, and is now live in the **Quarter-finals** — QF4, Apps bracket, vs **Turing Pits** (Jul 9–12).

## What it does

Mint an AI fan character as a real **ERC-7857 INFT** on 0G mainnet (`HeckleINFT` — the private
personality core is encrypted and sealed on 0G Storage, decryptable only by the current owner).
Attach it to an event; an inference agent generates in-character **takes** via **0G Compute
(TEE-attested)**, stores each on **0G Storage**, and commits the root **on-chain** — increasingly via
`HeckleVerifiedTakes`, which recovers the TEE signer on-chain and requires it be a trusted attestor in
`HeckleAttestationRegistry` before a take counts as verified. When the result lands, the take is graded
and the character's **reputation moves**.

For the Zero Cup we made the tournament itself the event. **Three characters — The Pundit, The Hater,
The Optimist — called all 16 R32 matchups (48 attested predictions), then got graded on-chain against
the real results** (The Hater leads, 9/16), and went on to call all 8 R16 matchups too (24 more
attested predictions). The honest flex: on their own R16 matchup, **two of three characters picked
AURA over Heckle** — Heckle won anyway, all on-chain. Heckle is now live in the **Quarter-finals**
(QF4, Apps bracket, vs Turing Pits, Jul 9–12), called by all **six flagship characters** — each a real
ERC-7857 INFT on `HeckleINFT` and registered on 0G's live **ERC-8004** `IdentityRegistry`. Anyone can
build a bracket on a radial canvas and **commit it on-chain** (`HeckleBrackets`), **upvote any take**
with weight = √(their character's reputation) (`HeckleVotes`), and the **same engine runs on the real
2026 World Cup** — The Pundit calls live knockout fixtures (football-data.org) before kickoff and the
results are settled on-chain via `HeckleResolver`.

## 0G primitives — all load-bearing (Rule 01)

| Primitive | Real work in Heckle |
|---|---|
| **0G Chain** | 10 contracts — mints, take commitments, contract-verified takes, trusted attestors, graded reputation, user bracket commits, sqrt-weighted votes, and an auditable real-world result oracle (`HeckleResolver`). |
| **0G Compute** | TEE-attested inference per take; the response signature recovers to the provider's on-chain `teeSignerAddress` — **replayable in the browser** on any `/storage/[root]`; model, node, temperature, and token usage are bound into the signed request hash. |
| **0G Storage** | Every take, personality, **character portrait**, event-metadata, and bracket blob, retrievable by Merkle root. Character images are uploaded to 0G at `/create` and rendered back from the gateway — not repo assets. |
| **ERC-7857 INFT** | Real INFTs now, on `HeckleINFT` — the six flagship characters. Public card open; private core (system seed, strategy, owner-gated memory) encrypted, sealed on 0G Storage, decryptable only by the current owner, re-encrypted on every transfer. |
| **Contract-verified takes** | `HeckleVerifiedTakes` recovers the 0G TEE signer on-chain and checks it against `HeckleAttestationRegistry`'s trusted attestors — enforced by a contract, not just client-side replayable. ~99 legacy takes backfilled as contract-verified. |
| **ERC-8004 identity** | Each flagship registered on 0G's live `IdentityRegistry`, pointing at its ERC-7857 identity (`HeckleINFT` contract + tokenId) — discoverable in the broader agent ecosystem. |

Strip any one and Heckle collapses: no Chain → nothing settles; no Compute → no attested takes; no
Storage → takes can't be replayed/audited; no INFT → characters aren't assets; no contract-verified
takes → signatures are checked by nobody; no ERC-8004 → characters have no portable identity outside
Heckle.

## Contract addresses (0G mainnet, chainId 16661)

| Contract | Address |
|---|---|
| HeckleCharacters (V1) | `0xfFB4A91Ff9C8dD16d9b0e0665d869392C8fCC0bc` |
| HeckleEvents | `0x30F9cF192A93C817d152606225a9C3DEC1d1B616` |
| HeckleTakes (legacy reputation) | `0x06c2d42c2fA90897138ddeBa9f2Bc6CcF064d2BD` |
| HeckleBrackets (user bracket commits) | `0xa1139baE1bdC2FC94A400bc8097342dB0A0f3E6B` |
| HeckleVotes (sqrt-weighted upvoting) | `0x86D905467F90a656fE77c60e666F7B9cdC9320bB` |
| HeckleResolver (real-world result oracle) | `0xE0014a5240DC8414A9684C747F8bc3E653F6e9a3` |
| HeckleAttestationRegistry (trusted TEE signers) | `0x8e6213269b003DD6f0B01401ACE1160AF1645403` |
| HeckleVerifiedTakes (contract-verified Proof of Take) | `0x39c138842E89B9f5935C0B050CE2dA86F21c88dF` |
| HeckleINFT (real ERC-7857 INFT — six flagships) | `0xD37eB2Ea885ebeB683b3d0511A3807c6F99746cC` |
| HeckleDataVerifier (ERC-7857 transfer-validity verifier) | `0x501e6Ff1759f0d762A0F9eD353280b26212df3CC` |

**All ten are source-verified on https://chainscan.0g.ai** — read the Solidity + verified-bytecode match
on the official 0G explorer. Plus ERC-8004 (0G's live Trustless-Agents registries, not deployed by us):
`IdentityRegistry` `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, `ReputationRegistry`
`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`. Reputation on the legacy path is a load-bearing subsystem
inside `HeckleTakes` (`reputationOf`, `gradePrediction`). Per-user cost to commit a bracket: ~0.00076 0G.

## Demo proof points (no login needed)

- **Proof explainer:** https://tryheckle.xyz/proof — what makes a take real, end to end.
- **Leaderboard:** https://tryheckle.xyz/leaderboard — every character graded live across both arenas (Zero Cup R32 + R16, and the World Cup), scored the moment each result is known / resolved on-chain.
- **A character's record:** https://tryheckle.xyz/characters/0 — The Pundit's track record (correct/wrong/pending) + transfer.
- **Verify a take in your browser:** https://tryheckle.xyz/storage/0xee27109152c63934180319a82f4af4264bd32cab156213f9619f20687d2f62a3 — click **Replay verification**; `recovered` = the on-chain TEE signer `0x2E79315804e7C8712afcEbF0E31F08174409D806`; `valid: true` ("TEE replay valid ✓", client-side).
- **Contract-verified takes:** https://tryheckle.xyz/explorer — filterable table of every take `HeckleVerifiedTakes` has recovered and checked against `HeckleAttestationRegistry` on-chain ("Contract-verified on-chain ✓"), plus the ten contracts and the ERC-8004 agents.
- **Transfer guarantees:** https://tryheckle.xyz/transfer-guarantees — the precise ERC-7857 on-transfer guarantees for `HeckleINFT`.
- **Zero Cup bracket:** https://tryheckle.xyz/zero-cup — the full 32-entrant board with the live Quarter-finals; build + commit your own bracket; ▲ vote any take.
- **World Cup mode:** https://tryheckle.xyz/events/world-cup — the **real 2026 World Cup knockouts** (live from football-data.org); The Pundit's pre-kickoff calls are settled on-chain against actual results via `HeckleResolver`.

## Stack

Next.js 16 / React 19 / Tailwind 4 (token-strict B&W) · wagmi 2 + RainbowKit 2 + viem 2 ·
Foundry (Solidity 0.8.24, cancun, OZ 5.0.2 — **10 contracts, 62 tests**) · Node inference agent
(`@0gfoundation/0g-compute-ts-sdk`, `@0gfoundation/0g-storage-ts-sdk`, ethers v6).

## The moat

Anyone can prompt an LLM to sound funny for one post. Heckle turns that voice into a portable
character with memory, ownership, receipts, and a public track record. **The model isn't the moat.
The record is the moat.**

## License

MIT — see [LICENSE](./LICENSE).
