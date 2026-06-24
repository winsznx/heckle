"use client";

import { use, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { DEMO_EVENT } from "@heckle/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { TakeCard } from "@/components/TakeCard";
import {
  charactersContract,
  eventsContract,
  takesContract,
  contractConfigured,
} from "@/lib/contracts";
import { fetchBlob, type PersonalityBlob, type TakeBlob } from "@/lib/storage";

interface OwnedOption {
  tokenId: bigint;
  name: string;
  handle: string;
}

interface LiveTake {
  takeId: string;
  characterId: string;
  kind: number;
  timestamp: bigint;
  takeRoot: `0x${string}`;
  text: string | null;
  triggerId: string | null;
}

function AttachPanel({ eventId }: { eventId: bigint }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [selected, setSelected] = useState<string>("");
  const [status, setStatus] = useState<
    | { phase: "idle" }
    | { phase: "pending" }
    | { phase: "done" }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

  const configured =
    contractConfigured(charactersContract.address) &&
    contractConfigured(eventsContract.address);

  const { data: owned, isLoading } = useQuery({
    queryKey: ["owned-options", address],
    enabled: Boolean(address) && Boolean(publicClient) && configured,
    queryFn: async (): Promise<OwnedOption[]> => {
      if (!publicClient || !address) return [];
      const logs = await publicClient.getLogs({
        address: charactersContract.address,
        event: charactersContract.abi[0],
        args: { owner: address },
        fromBlock: 0n,
        toBlock: "latest",
      });
      const ids = Array.from(
        new Set(
          logs
            .map((l) => l.args.tokenId)
            .filter((id): id is bigint => typeof id === "bigint")
            .map((id) => id.toString()),
        ),
      ).map((s) => BigInt(s));

      return Promise.all(
        ids.map(async (tokenId) => {
          const meta = await publicClient.readContract({
            address: charactersContract.address,
            abi: charactersContract.abi,
            functionName: "characterOf",
            args: [tokenId],
          });
          const blob = await fetchBlob<PersonalityBlob>(meta.personalityRoot);
          return {
            tokenId,
            name: blob?.name ?? `Heckler #${tokenId.toString()}`,
            handle: meta.handle,
          };
        }),
      );
    },
  });

  async function attach() {
    if (!selected || !publicClient) return;
    try {
      setStatus({ phase: "pending" });
      const hash = await writeContractAsync({
        address: eventsContract.address,
        abi: eventsContract.abi,
        functionName: "attachCharacter",
        args: [eventId, BigInt(selected)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus({ phase: "done" });
    } catch (err) {
      setStatus({
        phase: "error",
        message: err instanceof Error ? err.message : "Attach failed.",
      });
    }
  }

  if (!address) {
    return (
      <Card className="p-5">
        <p className="font-body opacity-70">
          Connect your wallet to attach a heckler to this event.
        </p>
      </Card>
    );
  }

  if (!configured) {
    return (
      <Card className="p-5">
        <p className="font-body opacity-70">
          Attaching is unavailable until the events contract is configured.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      <h3 className="font-display text-lg font-black">Attach a heckler</h3>
      {isLoading ? (
        <p className="font-mono text-xs uppercase opacity-60">Loading yours…</p>
      ) : !owned || owned.length === 0 ? (
        <p className="font-body text-sm opacity-70">
          You don&apos;t own any hecklers yet. Mint one first.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {owned.map((o) => {
              const isSel = selected === o.tokenId.toString();
              return (
                <button
                  key={o.tokenId.toString()}
                  type="button"
                  onClick={() => setSelected(o.tokenId.toString())}
                  className={`border border-rule px-3 py-2 font-mono text-xs uppercase tracking-wide transition-transform hover:-translate-y-px ${
                    isSel ? "bg-ink text-paper" : "bg-paper text-ink"
                  }`}
                >
                  {o.name} · #{o.tokenId.toString()}
                </button>
              );
            })}
          </div>
          <Button
            disabled={!selected || status.phase === "pending"}
            onClick={attach}
          >
            {status.phase === "pending"
              ? "Attaching…"
              : status.phase === "done"
                ? "Attached"
                : "Confirm attach"}
          </Button>
          {status.phase === "error" ? (
            <p className="font-mono text-xs opacity-70">{status.message}</p>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function LiveTimeline({ eventId }: { eventId: bigint }) {
  const publicClient = usePublicClient();
  const configured = contractConfigured(takesContract.address);

  const { data: takes } = useQuery({
    queryKey: ["event-takes", eventId.toString()],
    enabled: Boolean(publicClient) && configured,
    refetchInterval: 4000,
    queryFn: async (): Promise<LiveTake[]> => {
      if (!publicClient) return [];
      const logs = await publicClient.getLogs({
        address: takesContract.address,
        event: takesContract.abi[0],
        args: { eventId },
        fromBlock: 0n,
        toBlock: "latest",
      });

      const out = await Promise.all(
        logs.map(async (log) => {
          const takeId = log.args.takeId;
          const characterId = log.args.characterId;
          const kind = log.args.kind;
          const ts = log.args.timestamp;
          const root = log.args.takeRoot;
          if (
            typeof takeId !== "bigint" ||
            typeof characterId !== "bigint" ||
            typeof kind !== "number" ||
            typeof ts !== "bigint" ||
            typeof root !== "string"
          ) {
            return null;
          }
          const blob = await fetchBlob<TakeBlob>(root);
          return {
            takeId: takeId.toString(),
            characterId: characterId.toString(),
            kind,
            timestamp: ts,
            takeRoot: root as `0x${string}`,
            text: blob?.text ?? null,
            triggerId: typeof blob?.triggerId === "string" ? blob.triggerId : null,
          };
        }),
      );

      return out
        .filter((t): t is LiveTake => t !== null)
        .sort((a, b) => Number(a.timestamp - b.timestamp));
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {DEMO_EVENT.triggers.map((trigger) => {
        const triggerTakes = (takes ?? []).filter(
          (t) => t.triggerId === trigger.id,
        );
        return (
          <div key={trigger.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs opacity-60 w-12">
                {trigger.atSeconds}s
              </span>
              <Pill>{trigger.label}</Pill>
            </div>
            <p className="font-body text-sm opacity-80 pl-12">
              {trigger.context}
            </p>
            {triggerTakes.length > 0 ? (
              <div className="pl-12 flex flex-col gap-3">
                {triggerTakes.map((take) => (
                  <TakeCard
                    key={take.takeId}
                    text={take.text}
                    kind={take.kind}
                    timestamp={take.timestamp}
                    takeRoot={take.takeRoot}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <Divider />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-black">Committed takes</h3>
          <span className="font-mono text-xs uppercase opacity-60">
            Polling 0G
          </span>
        </div>
        {!configured ? (
          <p className="font-body text-sm opacity-70">
            Takes will stream here once the takes contract is configured.
          </p>
        ) : !takes || takes.length === 0 ? (
          <p className="font-body text-sm opacity-70">
            No takes committed yet. Attach a heckler and the agent will start
            speaking.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {takes.map((take) => (
              <TakeCard
                key={take.takeId}
                text={take.text}
                kind={take.kind}
                timestamp={take.timestamp}
                takeRoot={take.takeRoot}
                triggerLabel={`Heckler #${take.characterId}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const id = BigInt(eventId);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Pill tone="filled">Live</Pill>
          <span className="font-mono text-xs uppercase opacity-60">
            Event #{eventId}
          </span>
        </div>
        <h1 className="font-display font-black text-5xl leading-none">
          {DEMO_EVENT.title}
        </h1>
        <p className="font-body text-lg opacity-80">
          {DEMO_EVENT.homeTeam} vs {DEMO_EVENT.awayTeam}
        </p>
        <p className="font-body opacity-70 max-w-prose">
          {DEMO_EVENT.description}
        </p>
      </header>

      <AttachPanel eventId={id} />

      <Divider />

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-2xl font-black">Live timeline</h2>
        <LiveTimeline eventId={id} />
      </section>

      <Divider />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-black">After the whistle</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-rule border border-rule">
          {DEMO_EVENT.predictionFields.map((field) => (
            <div key={field.field} className="bg-paper p-5 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase opacity-60">
                {field.label}
              </span>
              <span className="font-display text-xl font-black">
                {field.resolvedValue}
              </span>
            </div>
          ))}
        </div>
        <Card className="p-5">
          <span className="font-mono text-xs uppercase opacity-60">
            Final outcome
          </span>
          <p className="font-display text-xl font-black mt-1">
            {DEMO_EVENT.finalOutcome}
          </p>
        </Card>
      </section>
    </div>
  );
}
