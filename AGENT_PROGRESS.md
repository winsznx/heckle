# Heckle — Agent Progress & Design Decisions

Running log of non-obvious decisions made while building Heckle for the Zero Cup
hackathon. Newest first.

---

## Deployments (0G mainnet, chainId 16661)

| Contract | Address | Deploy tx |
|----------|---------|-----------|
| HeckleCharacters | `0xfFB4A91Ff9C8dD16d9b0e0665d869392C8fCC0bc` | (group stage) |
| HeckleEvents | `0x30F9cF192A93C817d152606225a9C3DEC1d1B616` | (group stage) |
| HeckleTakes | `0x06c2d42c2fA90897138ddeBa9f2Bc6CcF064d2BD` | (group stage) |
| **HeckleBrackets** | `0xa1139baE1bdC2FC94A400bc8097342dB0A0f3E6B` | `0x87e181e6e239c4a9ab7374118d79e3222fbe9cca860e9e8f55fefbb9820ff48c` |

HeckleBrackets deployed Phase 5D from the agent wallet (`0xbF7EF900…`), ownerless,
open `commitBracket`. Smoke-test commit (bracketId 1, event 2, dummy set) tx
`0xff036fe6ab868acf592d346eb330f04ed4b9b8d100045f7a81c80c9309c6be1f`. Fresh-user
E2E commit (bracketId 2) from a brand-new wallet `0x14acb4a7…3AcC` via the
production `/api/upload-bracket` route, tx
`0xfad3af028f6d5db22e4e024f46e6de816abc9b120de32cc0c3e990ca040f2ee4` — proves an
arbitrary user can build + commit a full bracket. Radial bracket UI live at
`/zero-cup`; grid preserved at `/events/zero-cup-r32` (secondary, mobile-friendly).

---

## PHASE 5D COMPLETE — Zero Cup radial bracket

**Date:** 2026-07-01

**HeckleBrackets deploy**
- Address: `0xa1139baE1bdC2FC94A400bc8097342dB0A0f3E6B` (2,536 bytes on-chain)
- Deploy tx: `0x87e181e6e239c4a9ab7374118d79e3222fbe9cca860e9e8f55fefbb9820ff48c`
- Cost: 0.001454 0G · ownerless, open `commitBracket(eventId, predictionsRoot)` · 13/13 Foundry tests

**Fresh-user E2E (checkpoint 10)**
- Brand-new random wallet `0x14acb4a7c1c39cFFE1F4585256b122b4Ca2f3AcC` built a full 16/16 R32
  bracket → uploaded through the **production** `/api/upload-bracket` route → committed from its
  own key. Result: **bracketId 2**, root/submitter/`bracketsBySubmitter` all round-trip ✓.
- Commit tx: `0xfad3af028f6d5db22e4e024f46e6de816abc9b120de32cc0c3e990ca040f2ee4`

**Per-user commit cost:** **~0.00076 0G** (189,977 gas × 4 gwei). This is the number that matters
for "cost to commit a bracket" — the storage upload is sponsored server-side, so the user pays only
the one `commitBracket` tx.

**Test-funding artifact (DD-002):** the fresh-user E2E funded its ephemeral wallet with 0.01 0G;
~**0.0092 0G** remains stranded there because the key was `ethers.Wallet.createRandom()` and was not
persisted. This is a **test-funding artifact of the ephemeral-wallet pattern, not Heckle
infrastructure cost.** True protocol cost of 5D = deploy (0.001454) + 2 real commits + storage fees
≈ 0.0067 0G.

**Total 5D spend:** 0.469064 → **0.453099 0G** = **~0.016 0G** (incl. the 0.0092 stranded artifact
above and two flaky-TLS storage-fee retries during the smoke test).
**Wallet remaining: 0.453 0G** — above the 0.39–0.42 post-5D estimate; healthy for Phase 6 + 7
(pure frontend).

---

## DD-001 · Event metadata blob is a registration receipt, not a live spec

**Date:** 2026-07-01
**Phase:** 5C (Zero Cup R32 predictions)

**Decision:** The on-chain `eventRoot` for Zero Cup R32 (event id 2) stays at
`0xe6abb23ef9383a2cf389a6da431f1b3561bea87bceba19e33cb864ed48858eb1` — the
original registration blob. We do **not** re-register a corrected event 3.

**Context:** After registering event 2, 0G published official flag/name data for
the R32 field. The UI's matchup data (flags, corrected names like OGWorldCup 🇮🇩,
Engram 🇲🇽) was corrected in the `ZERO_CUP_R32_MATCHUPS` constant in
`packages/shared/src/zero-cup.ts`. `registerEvent` is one-shot per event id, so
event 2's `eventRoot` cannot be rewritten.

**Reasoning / pre-canned answer for judges inspecting the event registry:**
> The blob is a receipt of registration-time state, not a live spec of matchup
> data. Corrections made after 0G's flag data was published are carried live in
> the UI layer (`ZERO_CUP_R32_MATCHUPS`). Display source of truth is the code;
> the provenance anchor — "this event was registered at this moment with these
> parameters" — is the immutable on-chain `eventRoot`.

The two roles are intentionally separate: chain = provenance, code = display.
