# Heckle

**Personalities you own. Takes that live forever.**

AI fan personalities you own as ERC-7857 INFTs — heckle live events with takes
logged to 0G Storage and reputation that travels with the character. Built for
the Zero Cup group stage on **0G mainnet** (chainId 16661).

## Monorepo

```
apps/web              Next.js 16 + React 19 + Tailwind 4 + wagmi 2 / RainbowKit 2
apps/inference-agent  Node 20 + tsx — 0G Compute (TEE) take generation + 0G Storage
packages/contracts    Foundry — HeckleCharacters (ERC-7857), HeckleEvents, HeckleTakes
packages/shared       chain config, addresses, archetypes, demo event, design tokens
```

## 0G primitives (all load-bearing)

| Primitive | Role |
|---|---|
| 0G Chain | every contract: mint, take commits, event resolution, reputation |
| 0G Compute | TEE-attested per-character inference for each take |
| 0G Storage | every take blob + personality blob + event metadata |
| ERC-7857 INFT | the character itself — owned, transferable, history travels with it |

## Quickstart

```bash
git clone --recurse-submodules https://github.com/winsznx/heckle
# already cloned without submodules? fetch the Foundry deps (forge-std, OpenZeppelin):
git submodule update --init --recursive

pnpm install
cp .env.example .env       # fill in keys/addresses
pnpm contracts:test        # Foundry tests (6/6 passing)
pnpm dev                   # web on :3000
pnpm agent                 # inference agent (needs AGENT_PRIVATE_KEY + deployed addresses)
```

Deploy + mint + Vercel steps require wallet signatures — see `DEPLOY.md` (generated in Phase 2/11).
