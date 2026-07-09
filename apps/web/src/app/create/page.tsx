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

/** Downscale + re-encode a picked image to a small webp data URL so the copy
 *  stored on 0G stays light (it's served back from the gateway, not a CDN). */
async function toPortraitDataUrl(file: File, max = 640): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.85);
}

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
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
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

    let root: Hex;
    let uri: string;
    let imageRoot: string | undefined;

    // Optional portrait → 0G Storage first, so its root can ride in the blob.
    if (imageDataUrl) {
      try {
        setMint({ phase: "uploading" });
        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: imageDataUrl }),
        });
        if (!res.ok) {
          const data: { error?: string } = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Image upload failed (${res.status}).`);
        }
        const data: { root: string } = await res.json();
        imageRoot = data.root;
      } catch (err) {
        setMint({
          phase: "error",
          failed: "upload",
          message: err instanceof Error ? err.message : "Image upload failed.",
        });
        return;
      }
    }

    const blob = {
      name: name.trim(),
      handle: handle.trim(),
      archetype: archetypeId,
      personalityBrief: brief.trim(),
      palette: paletteId,
      createdAt: Math.floor(Date.now() / 1000),
      creator: address,
      ...(imageRoot ? { imageRoot } : {}),
    };

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

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    try {
      const dataUrl = await toPortraitDataUrl(file);
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if (Math.ceil(b64.length * 0.75) > 300 * 1024) {
        setImageError("That image is too heavy even downscaled — try a simpler one.");
        return;
      }
      setImageDataUrl(dataUrl);
    } catch {
      setImageError("Couldn't read that image.");
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-prose">
      <div className="flex flex-col gap-4">
        <h1 className="font-display font-black text-4xl">Create a heckler</h1>
        <p className="font-body text-sm opacity-70">
          Mints as a character token on 0G Chain, portrait uploaded to 0G Storage.
          The flagship hecklers (The Pundit, The Hater, The Optimist) run as full
          ERC-7857 INFTs with an encrypted personality core.
        </p>
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
        <div className="flex flex-col gap-6">
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

          <div className="flex flex-col gap-3 border border-rule p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wide opacity-70">
                Portrait (optional)
              </span>
              <span className="font-mono text-xs uppercase tracking-wide opacity-40">
                Stored on 0G
              </span>
            </div>
            <p className="font-body text-sm opacity-70">
              Give your heckler a face. It&rsquo;s downscaled and uploaded to 0G
              Storage — content-addressed and independently verifiable, not a repo
              asset. Skip it to use the archetype&rsquo;s default card.
            </p>
            <div className="flex items-center gap-4">
              {imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageDataUrl}
                  alt="portrait preview"
                  className="h-20 w-20 object-cover border border-rule grayscale"
                />
              ) : null}
              <label className="border border-rule bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide cursor-pointer hover:bg-whisper transition-colors">
                {imageDataUrl ? "Change image" : "Choose image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="hidden"
                  onChange={onPickImage}
                />
              </label>
              {imageDataUrl ? (
                <button
                  type="button"
                  onClick={() => setImageDataUrl(null)}
                  className="font-mono text-xs uppercase tracking-wide opacity-60 hover:opacity-100 underline underline-offset-2"
                >
                  Remove
                </button>
              ) : null}
            </div>
            {imageError ? (
              <p className="font-mono text-xs opacity-80">{imageError}</p>
            ) : null}
          </div>
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
