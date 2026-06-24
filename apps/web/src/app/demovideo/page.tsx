import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heckle — the 90-second demo",
  description: "Watch Heckle in 90 seconds: mint, attach, and stream TEE-attested takes on 0G.",
};

/** Accepts a bare 11-char id or any YouTube URL form. */
function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const match = input.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const videoId = extractYouTubeId(process.env.NEXT_PUBLIC_DEMO_VIDEO_ID ?? "");

export default function DemoVideoPage() {
  if (!videoId) {
    return (
      <section className="flex flex-col gap-4 py-12">
        <h1 className="font-display text-4xl">The 90-second demo</h1>
        <p className="text-lg">The walkthrough drops here the moment it&rsquo;s recorded.</p>
        <p className="font-mono text-xs uppercase tracking-wide text-ink">
          Set NEXT_PUBLIC_DEMO_VIDEO_ID to go live.
        </p>
      </section>
    );
  }

  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

  return (
    <section className="flex flex-col gap-6 py-4">
      <h1 className="font-display text-4xl">The 90-second demo</h1>
      <div className="aspect-video w-full border border-rule bg-ink">
        <iframe
          src={src}
          title="Heckle — the 90-second demo"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
      <p className="font-mono text-xs uppercase tracking-wide">
        Personalities you own. Takes that live forever.
      </p>
    </section>
  );
}
