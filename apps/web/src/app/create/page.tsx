"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, type Hex } from "viem";
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
  PALETTES,
  type ArchetypeId,
} from "@heckle/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Divider } from "@/components/ui/Divider";
import { Pill } from "@/components/ui/Pill";
import { CharacterCard } from "@/components/CharacterCard";
import { NetworkGate } from "@/components/NetworkGate";
import { charactersContract, contractConfigured } from "@/lib/contracts";
import { heckleCharactersAbi } from "@/lib/abis";

const BRIEF_MAX = 280;
const HANDLE_RE = /^[a-z0-9_]{2,20}$/;

type MintStage =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "signing"; root: Hex; uri: string }
  | { phase: "confirming"; root: Hex; uri: string; hash: Hex }
  | { phase: "error"; failed: "upload" | "mint"; message: string }
  | { phase: "done"; tokenId: string };

const STEP_LABELS = ["Archetype", "Identity", "Brief", "Palette", "Preview"];

function CreateFlow() {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState(0);
  const [archetypeId, setArchetypeId] = useState<ArchetypeId | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [brief, setBrief] = useState("");
  const [paletteId, setPaletteId] = useState<number | null>(null);
  const [mint, setMint] = useState<MintStage>({ phase: "idle" });

  const configured = contractConfigured(charactersContract.address);

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return archetypeId !== null;
      case 1:
        return name.trim().length >= 2 && HANDLE_RE.test(handle.trim());
      case 2:
        return brief.trim().length > 0 && brief.length <= BRIEF_MAX;
      case 3:
        return paletteId !== null;
      default:
        return true;
    }
  }, [step, archetypeId, name, handle, brief, paletteId]);

  const busy = mint.phase === "uploading" || mint.phase === "signing" || mint.phase === "confirming";

  async function runMint() {
    if (!archetypeId || paletteId === null || !address) return;
    if (!configured || !publicClient) {
      setMint({
        phase: "error",
        failed: "mint",
        message: "Characters contract address is not configured.",
      });
      return;
    }

    const blob = {
      name: name.trim(),
      handle: handle.trim(),
      archetype: archetypeId,
      personalityBrief: brief.trim(),
      palette: paletteId,
      createdAt: Math.floor(Date.now() / 1000),
      creator: address,
    };

    let root: Hex;
    let uri: string;

    try {
      setMint({ phase: "uploading" });
      const res = await fetch("/api/upload-personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blob),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${res.status}).`);
      }
      const data: { root: Hex; uri: string } = await res.json();
      root = data.root;
      uri = data.uri;
    } catch (err) {
      setMint({
        phase: "error",
        failed: "upload",
        message: err instanceof Error ? err.message : "Upload failed.",
      });
      return;
    }

    try {
      setMint({ phase: "signing", root, uri });
      const archetypeIndex = ARCHETYPE_IDS.indexOf(archetypeId);
      const hash = await writeContractAsync({
        address: charactersContract.address,
        abi: heckleCharactersAbi,
        functionName: "mint",
        args: [uri, archetypeIndex, handle.trim(), root],
      });

      setMint({ phase: "confirming", root, uri, hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let tokenId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: heckleCharactersAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "CharacterMinted") {
            tokenId = decoded.args.tokenId.toString();
            break;
          }
        } catch {
          continue;
        }
      }

      if (!tokenId) {
        throw new Error("Mint succeeded but CharacterMinted log was not found.");
      }

      setMint({ phase: "done", tokenId });
      router.push(`/characters/${tokenId}`);
    } catch (err) {
      setMint({
        phase: "error",
        failed: "mint",
        message: err instanceof Error ? err.message : "Mint failed.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-prose">
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-black text-4xl">Create a heckler</h1>
        <div className="flex flex-wrap gap-2">
          {STEP_LABELS.map((label, i) => (
            <Pill key={label} tone={i === step ? "filled" : "default"}>
              {`${i + 1} ${label}`}
            </Pill>
          ))}
        </div>
        <Divider />
      </div>

      {step === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-rule border border-rule">
          {ARCHETYPES.map((arch) => {
            const selected = archetypeId === arch.id;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => setArchetypeId(arch.id)}
                className={`text-left p-5 flex flex-col gap-2 transition-transform hover:-translate-y-px ${
                  selected ? "bg-ink text-paper" : "bg-paper text-ink"
                }`}
              >
                <span className="font-display text-xl font-black">
                  {arch.label}
                </span>
                <span className="font-body text-sm opacity-80">
                  {arch.blurb}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">
              Display name
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Verdict"
              maxLength={48}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-wide">
              Handle
            </span>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              placeholder="theverdict"
            />
            <span className="font-mono text-xs opacity-60">
              Lowercase letters, numbers, underscore. 2–20 characters.
            </span>
          </label>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs uppercase tracking-wide">
            Personality brief
          </label>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Reads the game through spacing and momentum. Never raises its voice."
            rows={5}
            maxLength={BRIEF_MAX}
          />
          <span className="font-mono text-xs opacity-60 self-end">
            {brief.length}/{BRIEF_MAX}
          </span>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule border border-rule">
          {PALETTES.map((pal) => {
            const selected = paletteId === pal.id;
            return (
              <button
                key={pal.id}
                type="button"
                onClick={() => setPaletteId(pal.id)}
                className="p-3 flex flex-col gap-2 transition-transform hover:-translate-y-px bg-paper"
              >
                <span
                  className="block h-16 border border-rule"
                  style={{ backgroundColor: pal.surface }}
                >
                  <span
                    className="block h-6 border-b border-rule"
                    style={{ backgroundColor: pal.fill }}
                  />
                </span>
                <span
                  className={`font-mono text-xs uppercase ${
                    selected ? "border-b-2 border-rule" : ""
                  }`}
                >
                  {pal.name}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {step === 4 && archetypeId && paletteId !== null ? (
        <div className="flex flex-col gap-6">
          <CharacterCard
            name={name.trim()}
            handle={handle.trim()}
            archetypeId={archetypeId}
            paletteId={paletteId}
            brief={brief.trim()}
          />

          {!configured ? (
            <div className="border border-rule bg-whisper p-4 font-mono text-xs">
              Characters contract address is not configured. Minting is disabled.
            </div>
          ) : null}

          {mint.phase === "error" ? (
            <div className="border border-rule bg-whisper p-4 flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-wide">
                {mint.failed === "upload" ? "Storage step failed" : "Mint step failed"}
              </span>
              <p className="font-body text-sm">{mint.message}</p>
              <Button onClick={runMint}>
                {mint.failed === "upload" ? "Retry upload" : "Retry mint"}
              </Button>
            </div>
          ) : null}

          {busy ? (
            <div className="border border-rule bg-whisper p-4 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wide">
                {mint.phase === "uploading"
                  ? "1/2 · Storing personality on 0G Storage…"
                  : mint.phase === "signing"
                    ? "2/2 · Awaiting signature…"
                    : "2/2 · Confirming on 0G mainnet…"}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      <Divider />
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          disabled={step === 0 || busy}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>

        {step < 4 ? (
          <Button disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        ) : (
          <Button
            disabled={busy || !configured || mint.phase === "done"}
            onClick={runMint}
          >
            {mint.phase === "done" ? "Minted" : "Mint heckler"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <NetworkGate>
      <CreateFlow />
    </NetworkGate>
  );
}
