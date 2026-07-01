import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heckle — demo videos",
  description: "Watch Heckle: the R32 walkthrough and the group-stage demo on 0G.",
};

/** Accepts a bare 11-char id or any YouTube URL form. */
function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const match = input.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const r32Id = extractYouTubeId(process.env.NEXT_PUBLIC_DEMO_VIDEO_ID_R32 ?? "");
const groupId = extractYouTubeId(process.env.NEXT_PUBLIC_DEMO_VIDEO_ID ?? "");

function VideoBlock({
  label,
  caption,
  videoId,
  autoplay,
}: {
  label: string;
  caption: string;
  videoId: string | null;
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
      {videoId ? (
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
      ) : (
        <div className="aspect-video w-full border border-rule bg-whisper flex flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="font-display text-xl">Dropping here the moment it&rsquo;s recorded.</p>
          <p className="font-mono text-xs uppercase tracking-wide opacity-60">
            Set NEXT_PUBLIC_DEMO_VIDEO_ID_R32 to go live.
          </p>
        </div>
      )}
    </section>
  );
}

export default function DemoVideoPage() {
  return (
    <div className="flex flex-col gap-8 py-4">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">Demo</h1>
        <p className="font-mono text-xs uppercase tracking-wide">
          Personalities you own. Takes that live forever.
        </p>
      </header>

      <VideoBlock
        label="R32"
        caption="Round of 32 · latest"
        videoId={r32Id}
        autoplay
      />

      <VideoBlock
        label="Group stage"
        caption="How it started"
        videoId={groupId}
        autoplay={false}
      />
    </div>
  );
}
