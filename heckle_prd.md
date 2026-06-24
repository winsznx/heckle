# Heckle — PRD v0.1

**One-liner:** AI fan personalities you own as INFTs that heckle live events on-chain — every take logged to 0G Storage, every prediction settled on-chain, reputation that travels with the character.

**Tournament:** Zero Cup group stage submission (Jun 24 deadline). Iterates through R32 (Jun 28), R16 (Jul 4), final lock (Jul 8).

**Repo:** fresh GitHub, all commits post Jun 15. Working name `heckle`.

---

## 1. The product, in plain language

You pick a personality archetype, give them a name and a voice, and mint them as an ERC-7857 INFT on 0G mainnet. The character is yours. You own it. You can transfer it.

You attach the character to a live event — a soccer match, a market move, a product launch, a political debate, anything happening with a timeline. As the event unfolds in real time, your character generates takes, reactions, predictions, and hot opinions in their voice. The takes stream to a public timeline. Other players' characters are reacting in parallel — the whole feed becomes a chat room of AI personalities with stakes.

After the event ends, predictions are graded against what actually happened. Community upvotes the hottest takes. Reputation accrues to the character's INFT. Top characters at season end get titles bound to the token.

The character is permanent and portable. Sell the character, sell the reputation, sell the take history.

---

## 2. Why this wins Zero Cup

- **Rule 01 — 0G load-bearing:** Storage holds every take immutably, Compute (TEE) runs the inference per character, INFT is the character itself, Chain settles predictions and reputation. Strip any primitive, product collapses.
- **Pattern 2 fix:** verb-led one-liner, four named objects (personalities, events, takes, reputation).
- **Pattern 4 fix:** owns a sharp slice — *live event reactivity for AI personalities*. Unclaimed in 0G APAC field.
- **Canvas alignment:** Zero Cup runs on the World Cup calendar — real matches happen during the tournament window. Heckle's content stream sits on top of the same events the tournament's aesthetic references.
- **Community vote optimization:** every event produces dozens of AI takes. The product manufactures quote-tweetable content as a side effect. Round QF+ rewards exactly this.
- **Fresh build:** zero code carryover from PACT. New repo, new name, new design.

---

## 3. Personas

**Owner-Operator (primary):** mints characters, runs them in events, tracks their reputation. Wants their character to develop a recognizable voice and rise on leaderboards. Demographic: crypto Twitter, sports/AI/markets-adjacent, owns 1-3 characters.

**Viewer (secondary):** doesn't own characters, watches the timeline, upvotes takes. Discovers personalities they want to mint or follow.

**Collector (v0.2):** buys high-reputation characters off the secondary market for their accumulated track record.

---

## 4. End-to-end flow

```
LANDING
   │
   ├── new visitor → "see how it works" → DEMO MODE (canned event)
   │
   ├── connect wallet → AUTH
   │
   └── existing user → DASHBOARD

AUTH (wallet connect, 0G mainnet)
   │
   ├── no characters yet → CREATE CHARACTER
   │
   └── has characters → DASHBOARD

CREATE CHARACTER
   │
   ├── pick archetype (homer / hater / analyst / drama / contrarian / optimist)
   ├── name + handle
   ├── personality brief (textarea, max 280 chars — character's voice prompt)
   ├── pick palette (one of 8 monochrome variants)
   └── preview → MINT (Storage write for personality blob, INFT mint on chain)
        │
        └── success → CHARACTER PROFILE

DASHBOARD (per-wallet)
   │
   ├── your characters grid → CHARACTER PROFILE
   ├── live events feed → EVENT PAGE
   ├── leaderboard → CHARACTER PROFILE (any)
   └── seasons (R16+) → SEASON PAGE

EVENT PAGE
   │
   ├── event header (name, status, start/end time, live indicator)
   ├── select character to attach → ATTACH FLOW
   │     ├── confirm attach
   │     └── Storage write linking character to event
   │
   ├── live timeline (streaming takes from all attached characters)
   │     ├── filter: all / mine / top-voted
   │     └── upvote takes (off-chain v1, on-chain v0.2)
   │
   └── post-event → results, predictions graded, reputation deltas

CHARACTER PROFILE
   │
   ├── header (name, archetype, INFT token id, owner address, reputation index)
   ├── personality brief (read-only after mint)
   ├── stats (events attended, takes generated, predictions correct, votes received)
   ├── take history (paginated, full 0G Storage URIs visible)
   ├── transfer button → TRANSFER FLOW
   └── chainscan link

TRANSFER FLOW
   │
   ├── recipient address input
   ├── warning copy ("the character's full take history and reputation transfer")
   └── on-chain ERC-7857 safeTransferFrom → recipient now owns
```

---

## 5. Visual system

Pure black and white. No accent color. No grays unless they're functional (borders, secondary text). The entire identity is typographic and structural.

### Colors

```
--ink:        #000000   /* primary text, primary surfaces */
--paper:      #FFFFFF   /* background */
--rule:       #000000   /* every border, no gray borders */
--whisper:    #F5F5F5   /* hover states, disabled fills */
--shadow:     #00000010 /* subtle elevation for cards */
```

That's the entire palette. No blues, no greens, no chartreuse. The constraint is the brand.

### Typography

- **Display:** a heavy serif or grotesque sans (candidates: Inter Display Black, Söhne Breit Kraftig, or a free alternative like Manrope ExtraBold). Used for character names and event headers.
- **Body:** a clean grotesque (Inter, IBM Plex Sans, or similar). 16px base, 1.5 line-height.
- **Mono:** for addresses, tx hashes, Storage URIs, technical metadata. Use JetBrains Mono or similar.

Self-host. No Google Fonts. Same lesson from CHUNK 9.5.

### Layout primitives

- 8px base spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- 1px borders everywhere they're needed, no shadows except in modals
- Maximum content width: 1080px desktop. Below that, 24px side padding.
- Cards: 1px solid ink border, white fill, no rounded corners (or 2px max if rounded feels too brutal)

### Components

- **Buttons:** primary = filled black with white text. Secondary = white with black border. Both have 1px hover offset (translateY(-1px) + harder shadow). No gradients. No glows.
- **Inputs:** white fill, 1px black border. Focus state = 2px black border. No blue browser focus rings.
- **Pills (status, archetype tags):** small uppercase mono labels with 1px border, 4px padding.
- **Cards:** 1px border, ample white space inside. No background fills.
- **Dividers:** 1px solid ink.

The whole thing should feel like a printed newspaper that happens to be on-chain. Generous whitespace, strong type hierarchy, no decoration.

### Mobile

- Single column below 768px
- Nav collapses to drawer (hamburger top right, drawer slides from right with all routes + wallet pill)
- Touch targets minimum 44×44px
- Timeline on event page: full-width cards, takes stack vertically
- Character grid on dashboard: 1 column on mobile, 2 on tablet, 3 on desktop

---

## 6. Routes and navigation

```
/                       Landing
/create                 Create character flow (auth-gated)
/dashboard              Your characters + recent activity
/characters/[tokenId]   Public character profile (any wallet)
/events                 Live events index
/events/[eventId]       Event page with live timeline
/leaderboard            Top characters this season
/seasons/[seasonId]     Season page (R16+ feature)
/transfer/[tokenId]     Transfer flow
/about                  How it works, the moat, the team
```

**Nav (desktop):**

```
HECKLE              Events     Leaderboard     About            [wallet pill]
```

**Nav (mobile):**

```
HECKLE                                                          [≡]
```

Wallet pill states match PACT V2 patterns: Connect / Switch to 0G Mainnet / address-with-dot.

---

## 7. Data model

### Character (on-chain INFT + Storage blob)

On INFT contract: `tokenId`, `owner`, `tokenURI` (points to Storage blob root).

On 0G Storage (immutable after mint):
```
{
  name: string,
  handle: string,
  archetype: "homer" | "hater" | "analyst" | "drama" | "contrarian" | "optimist",
  personalityBrief: string,  // <= 280 chars, the voice prompt
  palette: 1-8,
  createdAt: timestamp,
  creator: address
}
```

### Take (Storage blob, on-chain commitment)

Each take is a Storage blob root. When the character generates a take during an event, the seller agent uploads it to 0G Storage and commits the root to a `Take` event on the Heckle contract:

```
struct Take {
  uint256 characterId;
  uint256 eventId;
  bytes32 takeRoot;         // 0G Storage root
  uint64  timestamp;
  TakeKind kind;            // Reaction | Prediction | Debate
}
```

The take content blob:
```
{
  text: string,             // the take itself
  kind: string,             // matches enum
  prediction?: {            // only if kind === Prediction
    field: string,          // e.g. "winner" | "first_goal_minute"
    value: string
  },
  triggeringEvent?: {       // what the character was reacting to
    label: string,
    timestamp: timestamp
  },
  inferenceAttestation: {   // TEE proof the take came from registered model
    signature: bytes,
    signer: address,
    text: string
  }
}
```

### Event (Storage blob, on-chain registry)

```
struct Event {
  uint256 eventId;
  bytes32 eventRoot;        // metadata blob on Storage
  uint64  startsAt;
  uint64  endsAt;
  EventStatus status;       // Upcoming | Live | Settling | Settled
  address curator;          // who registered it
}
```

Event metadata blob:
```
{
  title: string,
  description: string,
  category: "sports" | "markets" | "politics" | "release" | "other",
  startsAt: timestamp,
  endsAt: timestamp,
  predictionFields: PredictionField[],  // what predictions can be made
  resolutionSource: string             // URL or oracle reference
}
```

### Reputation (on-chain, INFT-bound)

```
struct Reputation {
  uint256 characterId;
  uint128 takesGenerated;
  uint128 votesReceived;
  uint128 predictionsCorrect;
  uint128 predictionsTotal;
  uint128 weightedScore;    // sqrt-scaled from PACT pattern
  uint64  firstTakeAt;
  uint64  lastTakeAt;
}
```

---

## 8. Contracts (Solidity, 0G mainnet)

```
HeckleCharacters.sol       ERC-7857 INFT for characters
HeckleEvents.sol           Event registry + resolution
HeckleTakes.sol            Take commitment + voting
HeckleReputation.sol       INFT-bound reputation ledger
HeckleResolver.sol         Prediction grading + score updates
```

All fresh code, Foundry, Solidity 0.8.24, cancun. No PACT contract reuse. The architecture pattern is familiar but the code is new.

---

## 9. Off-chain services

**Seller-style inference agent (Node):** runs per character, watches attached events, generates takes at intervals or on event triggers, uploads to 0G Storage, commits roots on-chain. Same skeleton pattern from PACT seller-reference but generating takes instead of inference outputs.

**Event runner (Node + cron):** watches registered events, fetches outcome data when events resolve, calls HeckleResolver.gradeEvent which updates reputation per character based on prediction accuracy.

**Indexer (Node + Express):** caches Storage blob contents for fast take feed rendering. Live feed is a SSE stream from indexer to frontend.

**Frontend (Next 16 + React 19 + Tailwind 4):** new repo, fresh design system, no PACT carryover.

---

## 10. 0G primitives — each load-bearing per Rule 01

| Primitive | Real work |
|---|---|
| **0G Chain** | All Heckle contracts deployed and active. Character mints, take commitments, event resolution, reputation updates. |
| **0G Compute** | TEE-attested inference per character. Every take's text + signature pulled from the Compute provider, recoverable on-chain. Same pattern as PACT but for personality-driven generation. |
| **0G Storage** | Every take's full text is on Storage, retrievable by root. Character personality blobs on Storage. Event metadata on Storage. Removing Storage means takes can't be replayed, predictions can't be audited, characters can't be transferred with history. |
| **Agent ID (ERC-7857)** | The character itself. Owned, transferable. Reputation + take history travel with the token. Strip the INFT, characters can't be assets. |

Strip any one of these and Heckle stops being Heckle. That's the Rule 01 test cleared.

---

## 11. Build sequence by stage

### Group stage (Jun 22 → Jun 24 submission)

Goal: clear Rule 04 (public repo + working demo). Bare minimum end-to-end.

- Repo + brand + landing page
- Wallet auth + 0G mainnet switching
- Create character flow + INFT mint + Storage personality blob
- One canned demo event (recorded soccer match replay or similar, pre-loaded fixture)
- Character attaches to event → seller agent generates 6-10 takes streaming live to UI
- Takes commit to chain + Storage
- Post-event resolution shows graded predictions + reputation increment
- Character profile page with take history visible
- Deploy to fresh Vercel subdomain
- Submission writeup + demo video (90 seconds max)

What's deliberately deferred to R32: multi-character matchups in same event, real-time live events (not replay), community voting on takes, transfer flow, leaderboard.

### Round of 32 (Jun 28)

- Multi-character on same event (multiplayer)
- Off-chain upvoting on takes
- Transfer flow live + tested
- 2 more archetypes
- Leaderboard page
- Real live event (one) instead of replay

### Round of 16 (Jul 4)

- On-chain upvoting (vote weight = sqrt(voter character reputation))
- Season system + season page
- Public event registry (anyone can submit an event for curation)
- TEE attestation visualization (PACT's ECDSARecoveryViz pattern adapted)
- Polish + design refinement

### Final lock (Jul 8)

- Performance + edge cases
- Demo video re-record at full polish
- Audience push begins

---

## 12. Group stage Day 1 scope (what ships by Jun 24)

This is the only thing that matters this round.

**Pages:**
1. `/` Landing — hero, one-liner, "create your first heckler" CTA, "see live demo" CTA
2. `/create` — 5-step flow (archetype → name + handle → personality brief → palette → preview/mint)
3. `/dashboard` — your characters grid + one demo event card
4. `/events/[eventId]` — demo event timeline + attach character + live take stream
5. `/characters/[tokenId]` — public character profile

**Functionality:**
- Wallet connect (RainbowKit, same as PACT)
- 0G mainnet switching
- Character mint with Storage personality blob + ERC-7857 INFT mint
- Attach character to demo event (Storage write)
- Inference agent generates takes (one character, 6-10 takes over ~3 minutes of replay)
- Each take commits to chain (one tx per take) + Storage blob
- Predictions graded against canned event outcomes
- Reputation increment visible on character profile

**Defer (for R32):**
- Multi-character battles
- Voting
- Transfer
- Leaderboard
- Real live events

**Build order (Day 1 = today, ~24 hours):**

1. New repo, monorepo with apps/web, apps/inference-agent, packages/contracts, packages/shared
2. Contracts: minimal HeckleCharacters (ERC-7857), HeckleTakes, HeckleEvents
3. Deploy to 0G mainnet, save addresses to packages/shared
4. Frontend scaffold with the new black/white design system
5. Wallet connect + 0G mainnet switch
6. Create character flow end-to-end with real INFT mint
7. Dashboard + character profile
8. Demo event page + take feed UI
9. Inference agent: generate takes against canned event timeline, write to Storage, commit on chain
10. Wire everything together with TanStack Query polling
11. Deploy to Vercel
12. Demo video + submission writeup
13. Submit

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cold-start audience: no one watches the timeline | Solo mode works alone, inference agent generates takes regardless |
| Live event coordination too hard for Day 1 | Use a canned replay, fully scripted timeline |
| TEE attestation slow for live demo | Show streaming generation with the attestation arriving asynchronously, like a delayed receipt |
| Take quality varies wildly with prompt engineering | Pre-tune archetype prompts in seed data, lock them after Day 1 |
| Vote gaming in community voting (R16+) | sqrt-weighted votes (your vote weight is sqrt of your characters' total reputation) — same pattern PACT used for buyer reputation |
| Personalities feel generic without effort in brief | Encourage strong briefs in the create flow with examples, but allow simple briefs to ship |

---

## 14. Naming + brand

- Project: **Heckle**
- Frontend tagline: *"Personalities you own. Takes that live forever."*
- One-liner (form-ready): *"AI fan personalities you own as INFTs — heckle live events with takes logged to 0G Storage and reputation that travels with the character."*
- Twitter handle: **@heckle_0g** or similar (check availability)
- Domain: **heckle.show** or **heckle.live** (check availability) — `.show` is on-brand
- Wordmark: black serif word "Heckle" — full stop. No icon.

---

## 15. What's not in v1 (and why)

- **Real-time event integration with sports/markets APIs:** Day 1 uses replays. R16 adds one live event source.
- **Cross-character debates (one character replies to another):** R32 feature.
- **Reputation lending or character composability:** v0.2 post-Zero-Cup.
- **Mobile app:** mobile web works, native app is v0.2.
- **Premium archetypes or paid features:** free during tournament, paid after.

---

This is the spec. Locked unless you push back. Want me to write the Day 1 build prompt now, or do you want to push back on the archetypes / brand / scope first?