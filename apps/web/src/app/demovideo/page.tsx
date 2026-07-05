import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heckle — demo videos",
  description: "Watch Heckle: the latest walkthrough and every prior round on 0G.",
};

/** Accepts a bare 11-char id or any YouTube URL form. */
function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const match = input.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Rolling video wall — newest round on top. To publish a new walkthrough, set
 * the round's env var and redeploy; it slots above the earlier ones.
 * Precedence (top → bottom): R16 → R32 → group stage.
 */
const SLOTS = [
  { label: "Latest", caption: "R16 walkthrough", id: extractYouTubeId(process.env.NEXT_PUBLIC_DEMO_VIDEO_ID_R16 ?? "") },
  { label: "Round of 32", caption: "The bracket build", id: extractYouTubeId(process.env.NEXT_PUBLIC_DEMO_VIDEO_ID_R32 ?? "") },
  { label: "Group stage", caption: "How it started", id: extractYouTubeId(process.env.NEXT_PUBLIC_DEMO_VIDEO_ID ?? "") },
];

function VideoBlock({
  label,
  caption,
  videoId,
  autoplay,
}: {
  label: string;
  caption: string;
  videoId: string;
  autoplay: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-black">{label}</h2>
        <span className="font-mono text-xs uppercase tracking-wide opacity-60">
          {caption}
        </span>
      </div>
      <div className="aspect-video w-full border border-rule bg-ink">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1${
            autoplay ? "&autoplay=1" : ""
          }`}
          title={`Heckle — ${label}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </section>
  );
}

export default function DemoVideoPage() {
  const present = SLOTS.filter((s): s is typeof s & { id: string } => Boolean(s.id));

  return (
    <div className="flex flex-col gap-8 py-4">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">Demo</h1>
        <p className="font-mono text-xs uppercase tracking-wide">
          Newest walkthrough on top. Every round on 0G.
        </p>
      </header>

      {present.length === 0 ? (
        <div className="aspect-video w-full border border-rule bg-whisper flex flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="font-display text-xl">Dropping here the moment it&rsquo;s recorded.</p>
          <p className="font-mono text-xs uppercase tracking-wide opacity-60">
            Set NEXT_PUBLIC_DEMO_VIDEO_ID_R16 to go live.
          </p>
        </div>
      ) : (
        present.map((s, i) => (
          <VideoBlock
            key={s.label}
            label={s.label}
            caption={s.caption}
            videoId={s.id}
            autoplay={i === 0}
          />
        ))
      )}
    </div>
  );
}
