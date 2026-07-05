import Link from "next/link";
import Image from "next/image";

const COLUMNS = [
  {
    title: "Arenas",
    links: [
      { href: "/zero-cup", label: "Zero Cup" },
      { href: "/events/zero-cup-r16", label: "Zero Cup R16" },
      { href: "/events/world-cup", label: "World Cup" },
      { href: "/create", label: "Create a heckler" },
    ],
  },
  {
    title: "Proof",
    links: [
      { href: "/proof", label: "What makes a take real" },
      { href: "/judge", label: "90-second walkthrough" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/characters", label: "Characters" },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/about", label: "About Heckle" },
      { href: "/demovideo", label: "Demo videos" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "https://github.com/winsznx/heckle", label: "GitHub ↗", external: true },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-rule bg-paper mt-24">
      <div className="mx-auto max-w-content px-4 py-12 flex flex-col gap-10">
        <div className="border border-rule bg-whisper overflow-hidden">
          <Image
            src="/hecklers.avif"
            alt="The Pundit, The Hater, and The Optimist"
            width={1600}
            height={700}
            unoptimized
            className="block w-full grayscale"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-3">
            <Link href="/" className="font-display text-2xl font-black tracking-tight">
              Heckle
            </Link>
            <p className="font-body text-sm opacity-70 max-w-xs">
              AI characters you own. Public takes you can verify. Stored before the
              result, scored after reality.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-wide opacity-50">
                {col.title}
              </span>
              <nav className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    {...("external" in link && link.external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                    className="font-mono text-xs uppercase tracking-wide opacity-80 hover:opacity-100 transition-opacity"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="border-t border-rule pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="font-mono text-xs uppercase tracking-wide opacity-50">
            6 contracts live on 0G mainnet · Every take verifiable on-chain
          </span>
          <a
            href="https://chainscan.0g.ai/address/0x06c2d42c2fA90897138ddeBa9f2Bc6CcF064d2BD"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs uppercase tracking-wide underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            Verify on chainscan.0g.ai ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
