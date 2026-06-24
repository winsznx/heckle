# Heckle — Deploy & Seed Handoff

Every step here needs a **wallet signature / 0G spend**, so they are run by you, not the agent.
Target: **0G mainnet** (chainId **16661**, standard cancun EVM — **NOT** ZKsync, do not pass `--zksync`).

> Recommendation: do a free dry-run on **Galileo testnet (16602)** first to confirm cancun bytecode
> is accepted, then repeat against mainnet. Faucet: https://faucet.0g.ai

---

## 0. Prereqs

```bash
cd /Users/mac/heckle
cp .env.example .env        # then fill DEPLOYER_PRIVATE_KEY and AGENT_PRIVATE_KEY
```

Fund the **deployer** address with real 0G (mainnet has no faucet). Three small contracts —
estimated well under ~1 0G total at current gas. Confirm with `--estimate` before broadcasting.

---

## 1. (Optional, recommended) Testnet dry-run

```bash
cd packages/contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://evmrpc-testnet.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast -vvv
```
If you hit an `invalid opcode` revert, the chain rejects a cancun opcode — change `foundry.toml`
`evm_version = "cancun"` → `"shanghai"`, `forge build`, retest, then redeploy.

## 2. Deploy to 0G mainnet

```bash
cd packages/contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://evmrpc.0g.ai \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast -vvv
```
Copy the three logged addresses (HeckleCharacters / HeckleEvents / HeckleTakes).

## 3. Wire addresses into env

Paste into `/Users/mac/heckle/.env`:
```
NEXT_PUBLIC_HECKLE_CHARACTERS=0x...
NEXT_PUBLIC_HECKLE_EVENTS=0x...
NEXT_PUBLIC_HECKLE_TAKES=0x...
HECKLE_CHARACTERS=0x...   # (mirror for the agent)
HECKLE_EVENTS=0x...
HECKLE_TAKES=0x...
```

## 4. Authorize the inference agent as a Take committer

```bash
cast send $NEXT_PUBLIC_HECKLE_TAKES "setCommitter(address,bool)" <AGENT_ADDRESS> true \
  --rpc-url https://evmrpc.0g.ai --private-key $DEPLOYER_PRIVATE_KEY
```

## 5. Register the demo event (owner action)

```bash
cd /Users/mac/heckle
pnpm --filter @heckle/inference-agent seed -- --confirm   # registers DEMO_EVENT on-chain, sets it Live
```

## 6. (Phase 9) Seed the demo character + pre-run takes — **spends 0G**

The seed script can mint "The Pundit" from the agent wallet and walk it through the demo event so
`/characters/<id>` shows real takes for judges before login. Confirm the spend, then run with
`--confirm --mint-demo`. (Or mint the demo character through the live `/create` UI.)

## 7. Run the live inference agent

```bash
pnpm --filter @heckle/inference-agent start
```
It watches `HeckleEvents.CharacterAttached` for the demo event and, per attached character, generates
TEE-attested takes via 0G Compute, uploads each to 0G Storage, and commits the roots on-chain.

---

## 8. Web (local verify before Vercel)

```bash
pnpm --filter @heckle/web dev      # http://localhost:3000
```

Vercel deploy (Phase 11) needs your Vercel auth + domain — see `SUBMISSION.md`.
