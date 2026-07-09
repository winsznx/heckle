"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { hexToString, trim } from "viem";
import {
  HECKLE_ADDRESSES,
  ERC8004_ADDRESSES,
  ERC8004_AGENTS,
  WORLD_CUP_EVENT_ID,
} from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { HashLink } from "@/components/HashLink";
import { verifiedTakesContract, contractConfigured } from "@/lib/contracts";
import { formatTs } from "@/lib/format";

const FROM_BLOCK = 36996000n;
const CHAINSCAN = "https://chainscan.0g.ai/address/";
const TX = "https://chainscan.0g.ai/tx/";

const CHARACTER_NAMES: Record<string, string> = {
  "0": "The Pundit",
  "3": "The Hater",
  "4": "The Optimist",
};
function characterName(id: string): string {
  return CHARACTER_NAMES[id] ?? `Heckler #${id}`;
}
function eventName(id: string): string {
  if (id === String(WORLD_CUP_EVENT_ID)) return "World Cup";
  if (id === "2") return "Zero Cup";
  if (id === "1") return "Group stage";
  return `Event #${id}`;
}
function decodeMatchup(b: string): string {
  try {
    const s = hexToString(trim(b as `0x${string}`, { dir: "right" }));
    return s || "—";
  } catch {
    return "—";
  }
}

interface Row {
  takeId: string;
  characterId: string;
  eventId: string;
  matchup: string;
  takeRoot: string;
  signer: string;
  txHash: string;
  timestamp: bigint;
}

const CONTRACTS = [
  { name: "HeckleINFT", note: "ERC-7857 INFT (encrypted core)", addr: HECKLE_ADDRESSES.inft },
  { name: "HeckleDataVerifier", note: "ERC-7857 transfer verifier", addr: HECKLE_ADDRESSES.dataVerifier },
  { name: "HeckleVerifiedTakes", note: "contract-verified takes", addr: HECKLE_ADDRESSES.verifiedTakes },
  { name: "HeckleAttestationRegistry", note: "trusted 0G TEE signers", addr: HECKLE_ADDRESSES.attestationRegistry },
  { name: "HeckleCharacters", note: "ERC-721 (V1 / user characters)", addr: HECKLE_ADDRESSES.characters },
  { name: "HeckleEvents", note: "events + attachments", addr: HECKLE_ADDRESSES.events },
  { name: "HeckleTakes", note: "take commits + reputation", addr: HECKLE_ADDRESSES.takes },
  { name: "HeckleBrackets", note: "user bracket commits", addr: HECKLE_ADDRESSES.brackets },
  { name: "HeckleVotes", note: "sqrt-weighted votes", addr: HECKLE_ADDRESSES.votes },
  { name: "HeckleResolver", note: "real-world result oracle", addr: HECKLE_ADDRESSES.resolver },
] as const;

export default function ExplorerPage() {
  const publicClient = usePublicClient();
  const configured = contractConfigured(verifiedTakesContract.address);
  const [character, setCharacter] = useState("all");
  const [event, setEvent] = useState("all");
  const [q, setQ] = useState("");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["explorer-verified-takes"],
    enabled: Boolean(publicClient) && configured,
    queryFn: async (): Promise<Row[]> => {
      if (!publicClient) return [];
      const logs = await publicClient.getLogs({
        address: verifiedTakesContract.address,
        event: verifiedTakesContract.abi[0],
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
      });
      const out: Row[] = [];
      for (const l of logs) {
        const a = l.args;
        if (typeof a.takeRoot !== "string" || typeof a.characterId !== "bigint") continue;
        out.push({
          takeId: String(a.takeId ?? ""),
          characterId: a.characterId.toString(),
          eventId: a.eventId?.toString() ?? "",
          matchup: typeof a.matchupId === "string" ? decodeMatchup(a.matchupId) : "—",
          takeRoot: a.takeRoot,
          signer: typeof a.signer === "string" ? a.signer : "",
          txHash: String(l.transactionHash ?? ""),
          timestamp: typeof a.timestamp === "bigint" ? a.timestamp : 0n,
        });
      }
      out.sort((x, y) => Number(y.timestamp - x.timestamp));
      return out;
    },
  });

  const characters = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.characterId))).sort(),
    [rows],
  );
  const events = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.eventId))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (character !== "all" && r.characterId !== character) return false;
      if (event !== "all" && r.eventId !== event) return false;
      if (needle && !r.takeRoot.toLowerCase().includes(needle) && !r.txHash.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, character, event, q]);

  const selectCls =
    "border border-rule bg-paper px-3 py-2 font-mono text-xs uppercase tracking-wide";

  return (
    <div className="flex flex-col gap-8 py-4">
      <header className="flex flex-col gap-3">
        <Pill tone="filled">Heckle explorer</Pill>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          Browse Proof of Take
        </h1>
        <p className="font-body text-lg opacity-80 max-w-prose">
          A mini explorer over Heckle&rsquo;s live 0G mainnet contracts. Every row below is a
          contract-verified take from <strong>HeckleVerifiedTakes</strong> — filter by character or
          event, search by storage root or tx, and click through to 0G Storage and chainscan.
        </p>
      </header>

      <Divider />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wide opacity-50">Character</span>
          <select value={character} onChange={(e) => setCharacter(e.target.value)} className={selectCls}>
            <option value="all">All</option>
            {characters.map((c) => (
              <option key={c} value={c}>
                {characterName(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wide opacity-50">Event</span>
          <select value={event} onChange={(e) => setEvent(e.target.value)} className={selectCls}>
            <option value="all">All</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>
                {eventName(ev)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 grow min-w-48">
          <span className="font-mono text-xs uppercase tracking-wide opacity-50">Storage root / tx</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="0x…"
            className="border border-rule bg-paper px-3 py-2 font-mono text-xs"
          />
        </label>
        <span className="font-mono text-xs opacity-50 pb-2">
          {isLoading ? "loading…" : `${filtered.length} takes`}
        </span>
      </div>

      {/* Verified takes table */}
      <div className="overflow-x-auto border border-rule">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-rule bg-whisper font-mono text-xs uppercase tracking-wide">
              <th className="p-3">Character</th>
              <th className="p-3">Event</th>
              <th className="p-3">Matchup</th>
              <th className="p-3">Status</th>
              <th className="p-3">Storage root</th>
              <th className="p-3">Tx</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.takeId} className="border-b border-rule hover:bg-whisper transition-colors">
                <td className="p-3">
                  <Link href={`/characters/${r.characterId}`} className="font-mono text-xs underline underline-offset-2">
                    {characterName(r.characterId)}
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs opacity-80">{eventName(r.eventId)}</td>
                <td className="p-3 font-mono text-xs opacity-80">{r.matchup}</td>
                <td className="p-3">
                  <Pill tone="filled">Contract-verified ✓</Pill>
                </td>
                <td className="p-3">
                  <HashLink type="storage_root" value={r.takeRoot} />
                </td>
                <td className="p-3">
                  {r.txHash ? (
                    <a href={`${TX}${r.txHash}`} target="_blank" rel="noreferrer" className="font-mono text-xs underline underline-offset-2">
                      {r.txHash.slice(0, 10)}…
                    </a>
                  ) : (
                    <span className="opacity-40">—</span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs opacity-60 whitespace-nowrap">{formatTs(r.timestamp)}</td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center font-mono text-xs opacity-50">
                  No takes match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* ERC-8004 agents */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-black">ERC-8004 agents</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(ERC8004_AGENTS).map(([tokenId, agentId]) => (
            <Card key={tokenId} className="p-4 flex flex-col gap-1">
              <span className="font-display font-black">{characterName(tokenId)}</span>
              <a
                href={`${CHAINSCAN}${ERC8004_ADDRESSES.identity}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs underline underline-offset-2 opacity-70 hover:opacity-100"
              >
                agent #{agentId} ↗
              </a>
              <Link href={`/characters/${tokenId}`} className="font-mono text-xs opacity-60 underline underline-offset-2">
                profile →
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Contracts */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-black">Contracts — 10 live on 0G mainnet</h2>
        <div className="border border-rule divide-y divide-rule">
          {CONTRACTS.map((c) => (
            <a
              key={c.name}
              href={`${CHAINSCAN}${c.addr}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-whisper transition-colors"
            >
              <span className="font-mono text-sm font-bold">{c.name}</span>
              <span className="font-mono text-xs opacity-60">{c.note}</span>
              <span className="font-mono text-xs opacity-70 underline underline-offset-2 break-all">
                {c.addr} ↗
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
