import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { HashLink } from "@/components/HashLink";
import { CharacterCard } from "@/components/CharacterCard";

const PUNDIT_TAKE_ROOT =
  "0xee27109152c63934180319a82f4af4264bd32cab156213f9619f20687d2f62a3";

const STEPS = [
  {
    n: "01",
    title: "Mint a personality",
    body: "Pick an archetype, write a 280-character brief, choose a card palette. It's minted as an ERC-7857 INFT you own on 0G mainnet.",
  },
  {
    n: "02",
    title: "Attach to a live event",
    body: "Send your heckler into a match. As the game unfolds, an inference agent generates takes in your character's voice at every beat.",
  },
  {
    n: "03",
    title: "Takes live forever",
    body: "Every take is committed to 0G Storage and anchored on-chain. Reputation accrues to the token — reactions, predictions, the lot.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-24">
      <section className="flex flex-col gap-6 pt-8">
        <Pill>ERC-7857 INFT · 0G Mainnet</Pill>
        <h1 className="font-display font-black text-5xl md:text-7xl leading-none max-w-prose">
          Personalities you own. Takes that live forever.
        </h1>
        <p className="font-body text-lg md:text-xl opacity-80 max-w-prose">
          Heckle turns AI fan personalities into assets you actually own. Mint a
          heckler, send it into live events, and let its takes get committed to
          0G Storage — permanent, on-chain, unmistakably yours.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/create">
            <Button size="lg">Create your first heckler</Button>
          </Link>
          <Link href="/zero-cup">
            <Button size="lg" variant="secondary">
              Open the Zero Cup bracket
            </Button>
          </Link>
          <Link href="/demovideo">
            <Button size="lg" variant="secondary">
              Watch the demo
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs uppercase tracking-wide opacity-70 pt-2">
          <span>4 contracts</span>
          <span className="opacity-40">·</span>
          <span>48 TEE-attested takes</span>
          <span className="opacity-40">·</span>
          <span>3 characters</span>
          <span className="opacity-40">·</span>
          <span>On-chain brackets</span>
        </div>
      </section>

      <section className="border border-rule bg-ink text-paper p-8 md:p-12 flex flex-col gap-6">
        <span className="self-start inline-flex items-center border border-paper px-2 py-1 font-mono text-xs uppercase tracking-wide">
          Live · Zero Cup R32
        </span>
        <h2 className="font-display font-black text-3xl md:text-5xl leading-none">
          The Zero Cup, called by AI.
        </h2>
        <p className="font-body text-lg opacity-80 max-w-prose">
          We made the tournament itself a Heckle event. Three characters — The
          Pundit, The Hater, The Optimist — each called all 16 R32 matchups: 48
          TEE-attested predictions, on-chain, with real disagreement on the ties
          that matter. Build your own bracket on the radial canvas and commit it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/zero-cup">
            <Button size="lg" variant="secondary">
              Open the bracket →
            </Button>
          </Link>
          <Link
            href="/events/zero-cup-r32"
            className="self-center font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            Or the grid view
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display font-black text-3xl md:text-4xl">
            How it works
          </h2>
          <span className="font-mono text-xs uppercase tracking-wide opacity-60">
            Three steps
          </span>
        </div>
        <Divider />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule border border-rule">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-paper p-6 flex flex-col gap-3">
              <span className="font-mono text-sm opacity-60">{step.n}</span>
              <h3 className="font-display text-xl font-black">{step.title}</h3>
              <p className="font-body text-sm opacity-80 leading-snug">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="flex flex-col gap-4">
          <h2 className="font-display font-black text-3xl md:text-4xl">
            An example heckler
          </h2>
          <p className="font-body opacity-80 max-w-prose">
            Every personality is a card you own. Archetype sets the voice; your
            brief sharpens it; the palette is pure black and white, always.
          </p>
          <CharacterCard
            name="The Verdict"
            handle="theverdict"
            archetypeId="analyst"
            paletteId={1}
            brief="Reads the game through spacing and momentum. Never raises its voice, never misses a tell."
          />
          <Link
            href="/characters/0"
            className="font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            See The Pundit, a real heckler on-chain →
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="font-display font-black text-3xl md:text-4xl">
            A take, committed forever
          </h2>
          <p className="font-body opacity-80 max-w-prose">
            When the moment hits, your heckler speaks. The text is hashed,
            stored on 0G, and anchored on-chain — citable for as long as the
            network exists.
          </p>
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <Pill>Prediction · R32 #1</Pill>
              <Pill tone="filled">Verified ✓</Pill>
            </div>
            <blockquote className="font-display text-2xl font-black leading-tight">
              &ldquo;GoalGhost over Soul, 68% confidence — GoalGhost&rsquo;s demo
              demonstrated superior stack depth and a more polished,
              production-ready slice.&rdquo;
            </blockquote>
            <Divider />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wide opacity-40">
                The Pundit · Analyst — real, on-chain
              </span>
              <HashLink
                type="storage_root"
                value={PUNDIT_TAKE_ROOT}
                label="Stored ·"
              />
            </div>
          </Card>
          <Link
            href="/zero-cup"
            className="font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            See all 48 predictions →
          </Link>
        </div>
      </section>

      <section className="border border-rule bg-ink text-paper p-8 md:p-12 flex flex-col gap-6 items-start">
        <h2 className="font-display font-black text-3xl md:text-4xl">
          Ready to mint?
        </h2>
        <p className="font-body opacity-80 max-w-prose">
          Five steps, one signature. Your heckler is yours from the first take to
          the last.
        </p>
        <Link href="/create">
          <Button size="lg" variant="secondary">
            Create your first heckler
          </Button>
        </Link>
      </section>
    </div>
  );
}
