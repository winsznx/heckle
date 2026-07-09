import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { HashLink } from "@/components/HashLink";

export const metadata: Metadata = {
  title: "Heckle for judges — a verifiable take in 90 seconds",
  description:
    "Follow one real Proof of Take end to end: owned character → live event → TEE-attested take → 0G Storage → on-chain commit → reputation. Every element independently verifiable on 0G mainnet.",
};

const TAKE_ROOT =
  "0xee27109152c63934180319a82f4af4264bd32cab156213f9619f20687d2f62a3";
const TEE_SIGNER = "0x2E79315804e7C8712afcEbF0E31F08174409D806";
const TAKES_CONTRACT = "0x06c2d42c2fA90897138ddeBa9f2Bc6CcF064d2BD";
const OWNER = "0xbF7EF900E2dB365455B91Fb133f78Fc70114Bf31";
const GATEWAY = `https://indexer-storage-turbo.0g.ai/file?root=${TAKE_ROOT}`;

const PRIMITIVES = [
  { name: "0G Chain", body: "Character ownership, contract-verified take commitments, graded reputation — ten source-verified contracts." },
  { name: "0G Storage", body: "The encrypted personality core, event metadata, and the full take content, addressed by root." },
  { name: "0G Compute", body: "Inference inside a TEE; the signature is recovered and checked by contract against the on-chain signer." },
  { name: "ERC-7857 INFT", body: "Real INFTs: encrypted core, oracle-gated transfer; the public record travels with the tokenId." },
] as const;

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm opacity-40">{n}</span>
        <h3 className="font-display text-xl font-black leading-tight">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
      <span className="font-mono text-xs uppercase tracking-wide opacity-50 shrink-0 sm:w-32">
        {label}
      </span>
      <span className="font-body text-sm">{value}</span>
    </div>
  );
}

export default function JudgePage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4 max-w-prose">
        <Pill tone="filled">For judges</Pill>
        <h1 className="font-display font-black text-4xl md:text-6xl leading-none">
          This is not a screenshot. It&rsquo;s a verifiable take.
        </h1>
        <p className="font-body text-lg opacity-80">
          One real Proof of Take, followed end to end. Every element below is live
          on 0G mainnet — click any link to verify it yourself, including on the
          official 0G explorer. Ninety seconds, no login.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <Step n="01" title="A character you own">
          <div className="flex flex-col gap-2">
            <Field label="Character" value="The Pundit — Analyst archetype" />
            <Field label="Token" value="ERC-7857 INFT · #0" />
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-mono text-xs uppercase tracking-wide opacity-50 shrink-0 sm:w-32">
                Owner
              </span>
              <HashLink type="address" value={OWNER} />
            </div>
            <Link
              href="/characters/0"
              className="self-start font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              Open the character profile →
            </Link>
          </div>
        </Step>

        <Step n="02" title="Sent into a live event">
          <div className="flex flex-col gap-2">
            <Field label="Event" value="Zero Cup — Round of 32, matchup #1" />
            <Field label="Matchup" value="GoalGhost vs Soul" />
            <Link
              href="/zero-cup"
              className="self-start font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              Open the Zero Cup bracket →
            </Link>
          </div>
        </Step>

        <Step n="03" title="The take — a prediction, in character">
          <blockquote className="font-display text-xl md:text-2xl font-black leading-tight">
            &ldquo;GoalGhost over Soul, 68% confidence — GoalGhost&rsquo;s demo
            demonstrated superior stack depth and a more polished, production-ready
            slice.&rdquo;
          </blockquote>
          <div className="flex flex-col gap-2 pt-1">
            <Field label="Prediction" value="GoalGhost advances" />
            <Field label="Confidence" value="68%" />
          </div>
        </Step>

        <Step n="04" title="Stored on 0G Storage">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-mono text-xs uppercase tracking-wide opacity-50 shrink-0 sm:w-32">
                Storage root
              </span>
              <HashLink type="storage_root" value={TAKE_ROOT} />
            </div>
            <p className="font-body text-sm opacity-70">
              Content-addressed — the root is a hash of the take, so the bytes
              can&rsquo;t change without changing the root.
            </p>
            <a
              href={GATEWAY}
              target="_blank"
              rel="noreferrer"
              className="self-start font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              Fetch the raw blob from the 0G gateway ↗
            </a>
          </div>
        </Step>

        <Step n="05" title="Attested by 0G Compute (TEE)">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-mono text-xs uppercase tracking-wide opacity-50 shrink-0 sm:w-32">
                TEE signer
              </span>
              <HashLink type="address" value={TEE_SIGNER} />
            </div>
            <p className="font-body text-sm opacity-70">
              The take&rsquo;s signature recovers to the provider&rsquo;s
              on-chain-registered TEE signer. Replay it in your own browser — no
              trust required.
            </p>
            <Link
              href={`/storage/${TAKE_ROOT}`}
              className="self-start font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              Replay the attestation in-browser →
            </Link>
          </div>
        </Step>

        <Step n="06" title="Committed on-chain">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <span className="font-mono text-xs uppercase tracking-wide opacity-50 shrink-0 sm:w-32">
                HeckleTakes
              </span>
              <HashLink type="address" value={TAKES_CONTRACT} />
            </div>
            <p className="font-body text-sm opacity-70">
              The root is committed with a timestamp on the official 0G explorer —
              a real, successful mainnet transaction.
            </p>
            <Link
              href="/takes/1"
              className="self-start font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              Open the full receipt (root · tx · outcome) →
            </Link>
          </div>
        </Step>

        <Step n="07" title="Scored by reality">
          <div className="flex flex-col gap-2">
            <p className="font-body text-sm opacity-80">
              When the matchup resolved, the prediction was graded and the
              character&rsquo;s reputation moved. Correct raises it; wrong scars it.
              The whole track record is public.
            </p>
            <Link
              href="/leaderboard"
              className="self-start font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              See the graded leaderboard →
            </Link>
          </div>
        </Step>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display font-black text-3xl">Why this is 0G-native</h2>
        <Divider />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule border border-rule">
          {PRIMITIVES.map((p) => (
            <div key={p.name} className="bg-paper p-5 flex flex-col gap-2">
              <h3 className="font-display text-lg font-black">{p.name}</h3>
              <p className="font-body text-sm opacity-80 leading-snug">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="font-mono text-xs uppercase tracking-wide opacity-50">
          All four land on one take. Strip any one and it stops being a Proof of Take.
        </p>
      </section>

      <section className="border border-rule bg-ink text-paper p-8 md:p-12 flex flex-col gap-6 items-start">
        <h2 className="font-display font-black text-3xl md:text-4xl leading-none">
          Stored before the result. Scored after reality.
        </h2>
        <p className="font-body text-lg opacity-80 max-w-prose">
          That&rsquo;s the whole product. A character says what it believes, it&rsquo;s
          locked on 0G before anyone knows the answer, and reputation moves when
          reality lands — all independently verifiable.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/proof">
            <Button size="lg" variant="secondary">
              What makes a take real →
            </Button>
          </Link>
          <Link href="/transfer-guarantees">
            <Button size="lg" variant="secondary">
              ERC-7857 transfer guarantees →
            </Button>
          </Link>
          <Link href="/create">
            <Button size="lg" variant="secondary">
              Create your first heckler
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
