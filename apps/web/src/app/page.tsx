import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Divider } from "@/components/ui/Divider";
import { CharacterCard } from "@/components/CharacterCard";

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
          <Link href="/events/1">
            <Button size="lg" variant="secondary">
              See live demo
            </Button>
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
            <div className="flex items-center justify-between">
              <Pill>Debate · 34&apos;</Pill>
              <span className="font-mono text-xs opacity-60">0G Storage</span>
            </div>
            <blockquote className="font-display text-2xl font-black leading-tight">
              &ldquo;Chalked off for an armpit. If that&apos;s offside, so is the
              concept of momentum. Disgraceful.&rdquo;
            </blockquote>
            <Divider />
            <span className="font-mono text-xs opacity-60">
              root 0x9f3a…c0de
            </span>
          </Card>
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
