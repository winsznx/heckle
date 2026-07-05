import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import {
  buildWcMatchesUrl,
  parseWcMatchesResponse,
  WC_OUTCOME_ENUM,
  WC_KNOCKOUT_STAGES,
  DEPLOYED_ADDRESSES,
} from "@heckle/shared";

/**
 * Manual, on-demand counterpart to the wc-auto cron: settle any finished World
 * Cup knockout result into HeckleResolver from the real feed. Anyone can trigger
 * it, but it only ever writes a result that (a) is genuinely finished per the
 * live feed and (b) isn't finalized on-chain yet.
 *
 * Correctness idempotency is enforced on-chain: resolveBatch skips finalized
 * matches and _resolve reverts on them, so no result is ever written twice. The
 * in-process cooldown + the feed's rate-limit headroom check are just there to
 * keep a burst of clicks from spending gas or exhausting the shared feed quota
 * (they gate the fetch before any work); on a single persistent server process
 * that's effective, and even if bypassed the on-chain guard still holds.
 *
 * This is not a prediction market: no stakes, no payouts — it writes the true
 * outcome so a character's Proof of Take can be scored against an on-chain record.
 */

const RESOLVER_ABI = [
  "function isFinalized(uint256) view returns (bool)",
  "function resolveBatch(uint256[] matchIds, uint8[] outcomes, uint16[] homeScores, uint16[] awayScores, bool[] finalizedFlags)",
];

const COOLDOWN_MS = 20_000;
let lastRun = 0;

export async function POST() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  const agentKey = process.env.AGENT_PRIVATE_KEY;
  const rpcUrl = process.env.ZG_RPC_URL || "https://evmrpc.0g.ai";
  const resolverAddr =
    process.env.NEXT_PUBLIC_HECKLE_RESOLVER || DEPLOYED_ADDRESSES.resolver;

  if (!token || !agentKey) {
    return NextResponse.json({ ok: false, error: "unconfigured" });
  }

  const now = Date.now();
  if (now - lastRun < COOLDOWN_MS) {
    return NextResponse.json({ ok: true, settled: [], cooldown: true });
  }
  lastRun = now;

  try {
    const res = await fetch(buildWcMatchesUrl(), {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `feed ${res.status}` });
    }
    // Don't compound pressure on the shared free-tier quota: if the feed says
    // it's out of headroom this minute, stop before doing any on-chain work.
    const headroom = res.headers.get("X-Requests-Available-Minute");
    if (headroom !== null && Number(headroom) <= 0) {
      return NextResponse.json({ ok: true, settled: [], rateLimited: true });
    }
    const fixtures = parseWcMatchesResponse(await res.json());
    const finished = fixtures.filter(
      (f) =>
        f.finished &&
        f.score.outcome !== null &&
        (WC_KNOCKOUT_STAGES as readonly string[]).includes(f.stage),
    );

    const provider = new JsonRpcProvider(rpcUrl);
    const signer = new Wallet(agentKey, provider);
    const resolver = new Contract(resolverAddr, RESOLVER_ABI, signer);

    const toSettle = [];
    for (const f of finished) {
      const alreadyFinal: boolean = await resolver.isFinalized(f.matchId);
      if (!alreadyFinal) toSettle.push(f);
    }
    if (toSettle.length === 0) {
      return NextResponse.json({ ok: true, settled: [], message: "all settled" });
    }

    const tx = await resolver.resolveBatch(
      toSettle.map((f) => f.matchId),
      toSettle.map((f) => WC_OUTCOME_ENUM[f.score.outcome!]),
      toSettle.map((f) => f.score.home ?? 0),
      toSettle.map((f) => f.score.away ?? 0),
      toSettle.map(() => true),
    );
    await tx.wait();

    return NextResponse.json({
      ok: true,
      tx: tx.hash,
      settled: toSettle.map((f) => ({
        matchId: f.matchId,
        home: f.home.name,
        away: f.away.name,
        outcome: f.score.outcome,
      })),
    });
  } catch (err) {
    // Log detail server-side; return a generic message so an anonymous caller
    // can't use failures to enumerate RPC/contract/revert internals.
    console.error("[worldcup/resolve]", err);
    return NextResponse.json({ ok: false, error: "resolve_failed" });
  }
}
