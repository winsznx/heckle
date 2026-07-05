"use client";

import type { ReactNode } from "react";
import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { storageUri, archetype, ARCHETYPE_IDS, type ArchetypeId } from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { HashLink } from "@/components/HashLink";
import { TeeReplay } from "@/components/TeeReplay";
import { fetchBlob, type InferenceAttestation } from "@/lib/storage";

type Blob = Record<string, unknown>;

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

type BlobKind = "take" | "personality" | "event" | "unknown";

function classify(blob: Blob): BlobKind {
  if (blob.inferenceAttestation || (blob.text && blob.kind)) return "take";
  if (blob.personalityBrief || (blob.handle && blob.name && !blob.text)) return "personality";
  if (blob.title && (blob.predictionFields || blob.triggers || blob.homeTeam)) return "event";
  return "unknown";
}

function asArchetype(id: string | undefined): ArchetypeId | null {
  return id && (ARCHETYPE_IDS as readonly string[]).includes(id) ? (id as ArchetypeId) : null;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs uppercase tracking-wide opacity-50">{label}</span>
      <div className="font-mono text-xs break-all">{children}</div>
    </div>
  );
}

function CopyUriButton({ root }: { root: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(storageUri(root));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center border border-rule bg-paper text-ink px-3 py-1 font-mono text-xs uppercase tracking-wide transition-transform hover:-translate-y-px"
    >
      {copied ? "Copied" : "Copy URI"}
    </button>
  );
}

function AttestationPanel({ att }: { att: InferenceAttestation }) {
  if (!att.signature) return null;
  const valid = att.valid === true;
  const match =
    !!att.recovered &&
    !!att.signer &&
    att.recovered.toLowerCase() === att.signer.toLowerCase();

  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-black">Inference attestation</h3>
        {valid ? <Pill tone="filled">Verified ✓</Pill> : <Pill>Verification pending</Pill>}
      </div>
      <p className="font-body text-sm opacity-70">
        TEE-attested by 0G Compute. Recover the signer from the signed text +
        signature (EIP-191) and confirm it equals the on-chain TEE signer —
        fully offline, zero trust in Heckle.
      </p>
      <Divider />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {att.signer ? (
          <Field label="Signer · on-chain TEE">
            <HashLink type="address" value={att.signer} />
          </Field>
        ) : null}
        {att.recovered ? (
          <Field label={`Recovered locally${match ? " · match ✓" : ""}`}>
            {att.recovered}
          </Field>
        ) : null}
      </div>
      {att.signedText ? (
        <Field label="Signed text · sha256(req):sha256(resp)">{att.signedText}</Field>
      ) : null}
      {att.signature ? (
        <Field label="Signature · ECDSA / EIP-191">{att.signature}</Field>
      ) : null}
      {att.chatId ? <Field label="Chat id">{att.chatId}</Field> : null}
      {att.signedText && att.signature && att.signer ? (
        <TeeReplay
          signedText={att.signedText}
          signature={att.signature}
          signer={att.signer}
        />
      ) : null}
    </Card>
  );
}

function TakeView({ blob }: { blob: Blob }) {
  const text = str(blob.text);
  const kind = str(blob.kind);
  const characterId = str(blob.characterId);
  const prediction = str(blob.prediction);
  const trig = blob.triggeringEvent as { label?: string } | undefined;
  const att = blob.inferenceAttestation as InferenceAttestation | null | undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {kind ? <Pill>{kind}</Pill> : null}
          {trig?.label ? (
            <span className="font-mono text-xs opacity-60">{trig.label}</span>
          ) : null}
        </div>
        {text ? (
          <blockquote className="font-display text-2xl md:text-3xl font-black leading-tight">
            &ldquo;{text}&rdquo;
          </blockquote>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs opacity-60">
          {characterId ? (
            <Link
              href={`/characters/${characterId}`}
              className="underline underline-offset-2 hover:opacity-100 transition-opacity"
            >
              By Heckler #{characterId} →
            </Link>
          ) : null}
          {prediction ? <span>Prediction: {prediction}</span> : null}
        </div>
      </div>
      {att ? <AttestationPanel att={att} /> : null}
    </div>
  );
}

function PersonalityView({ blob }: { blob: Blob }) {
  const name = str(blob.name);
  const handle = str(blob.handle);
  const brief = str(blob.personalityBrief);
  const creator = str(blob.creator);
  const arch = asArchetype(str(blob.archetype));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="filled">Personality</Pill>
        {arch ? <Pill>{archetype(arch).label}</Pill> : null}
      </div>
      {name ? (
        <h2 className="font-display text-3xl font-black leading-none">{name}</h2>
      ) : null}
      {handle ? <p className="font-mono text-sm opacity-70">@{handle}</p> : null}
      {brief ? <p className="font-body text-lg opacity-90 max-w-prose">{brief}</p> : null}
      {creator ? (
        <Field label="Creator">
          <HashLink type="address" value={creator} />
        </Field>
      ) : null}
    </div>
  );
}

function EventView({ blob }: { blob: Blob }) {
  const title = str(blob.title);
  const description = str(blob.description);
  const home = str(blob.homeTeam);
  const away = str(blob.awayTeam);
  const outcome = str(blob.finalOutcome);
  const fields = Array.isArray(blob.predictionFields)
    ? (blob.predictionFields as { label?: string; resolvedValue?: string }[])
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Pill tone="filled">Event</Pill>
      {title ? (
        <h2 className="font-display text-3xl font-black leading-none">{title}</h2>
      ) : null}
      {home && away ? (
        <p className="font-body text-lg opacity-80">
          {home} vs {away}
        </p>
      ) : null}
      {description ? (
        <p className="font-body opacity-70 max-w-prose">{description}</p>
      ) : null}
      {fields.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-rule border border-rule">
          {fields.map((f, i) => (
            <div key={i} className="bg-paper p-4 flex flex-col gap-1">
              <span className="font-mono text-xs uppercase opacity-60">{f.label}</span>
              <span className="font-display text-lg font-black">{f.resolvedValue}</span>
            </div>
          ))}
        </div>
      ) : null}
      {outcome ? (
        <Card className="p-5">
          <span className="font-mono text-xs uppercase opacity-60">Final outcome</span>
          <p className="font-display text-xl font-black mt-1">{outcome}</p>
        </Card>
      ) : null}
    </div>
  );
}

export default function StoragePage({
  params,
}: {
  params: Promise<{ root: string }>;
}) {
  const { root } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["storage-blob", root],
    queryFn: () => fetchBlob<Blob>(root),
  });

  const kind = data ? classify(data) : "unknown";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-black">0G Storage blob</h1>
        <p className="font-mono text-xs opacity-60 break-all">{root}</p>
        <div className="flex flex-wrap items-center gap-3">
          <CopyUriButton root={root} />
          <a
            href={storageUri(root)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            View raw blob →
          </a>
        </div>
      </header>

      <Divider />

      {isLoading ? (
        <p className="font-mono text-xs uppercase opacity-60">Loading from 0G Storage…</p>
      ) : isError || data == null ? (
        <Card className="p-6">
          <p className="font-body opacity-70">
            Blob not retrievable from 0G Storage for this root.
          </p>
        </Card>
      ) : kind === "take" ? (
        <TakeView blob={data} />
      ) : kind === "personality" ? (
        <PersonalityView blob={data} />
      ) : kind === "event" ? (
        <EventView blob={data} />
      ) : (
        <Card className="p-6">
          <pre className="font-mono text-xs whitespace-pre-wrap break-all">
            {JSON.stringify(data, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
