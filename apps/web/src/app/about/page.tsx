import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Pill } from "@/components/ui/Pill";

const PRIMITIVES = [
  {
    name: "0G Chain",
    role: "Ownership",
    body: "Personalities are ERC-7857 INFTs minted on 0G mainnet. The token is the asset; reputation and provenance accrue to it on-chain.",
  },
  {
    name: "0G Storage",
    role: "Permanence",
    body: "Every take and every personality brief is content-addressed on 0G Storage. Retrievable by root hash, forever — no centralized server to vanish.",
  },
  {
    name: "0G Compute",
    role: "Voice",
    body: "An inference agent runs each personality through 0G Compute, generating takes in-character at every beat of a live event.",
  },
  {
    name: "0G Data Availability",
    role: "Trust",
    body: "Take roots are anchored with verifiable availability, so anyone can confirm a heckler said what it said, when it said it.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-16 max-w-prose">
      <section className="flex flex-col gap-6 pt-4">
        <Pill>About Heckle</Pill>
        <h1 className="font-display font-black text-4xl md:text-5xl leading-none">
          Personalities you own. Takes that live forever.
        </h1>
        <p className="font-body text-lg opacity-80">
          Heckle is an experiment in ownable AI characters. You design a fan
          personality, mint it as an INFT, and send it into live events where it
          reacts, predicts, and argues in a voice that&apos;s unmistakably its
          own — and yours.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display font-black text-3xl">How it works</h2>
        <Divider />
        <ol className="flex flex-col gap-4 font-body opacity-90">
          <li>
            <span className="font-mono text-xs uppercase mr-2 opacity-60">
              01
            </span>
            You pick an archetype and write a short brief. That becomes a
            personality blob stored on 0G Storage and minted to you as a token.
          </li>
          <li>
            <span className="font-mono text-xs uppercase mr-2 opacity-60">
              02
            </span>
            You attach your heckler to a live event. The inference agent walks
            the event&apos;s beats and generates takes in character.
          </li>
          <li>
            <span className="font-mono text-xs uppercase mr-2 opacity-60">
              03
            </span>
            Each take is committed to 0G Storage and anchored on-chain.
            Reputation — takes generated, predictions correct — accrues to the
            token.
          </li>
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display font-black text-3xl">The moat</h2>
        <Divider />
        <p className="font-body opacity-90">
          Anyone can prompt an LLM to sound like a fan. What they can&apos;t do
          is make that personality a portable, ownable, provable asset with a
          permanent record of everything it&apos;s ever said. Heckle&apos;s moat
          isn&apos;t the model — it&apos;s the ownership and the permanence.
          Personalities compound. The longer a heckler lives, the deeper its
          track record, and that record is yours.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display font-black text-3xl">
          Four load-bearing 0G primitives
        </h2>
        <Divider />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-rule border border-rule">
          {PRIMITIVES.map((p) => (
            <div key={p.name} className="bg-paper p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black">{p.name}</h3>
                <span className="font-mono text-xs uppercase opacity-60">
                  {p.role}
                </span>
              </div>
              <p className="font-body text-sm opacity-80 leading-snug">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 items-start">
        <Link href="/create">
          <Button size="lg">Create your first heckler</Button>
        </Link>
      </section>
    </div>
  );
}
