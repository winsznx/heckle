"use client";

import { useState } from "react";

const GATEWAY = "https://indexer-storage-turbo.0g.ai/file?root=";

/** Render a user-created portrait straight from 0G Storage by root, degrading to
 *  a neutral placeholder if the gateway 404s or the indexer hasn't propagated. */
export function GatewayPortrait({
  root,
  name,
  className = "",
}: {
  root: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-whisper ${className}`}
        aria-label={`${name} portrait unavailable`}
      >
        <span className="font-display text-3xl font-black opacity-30">
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${GATEWAY}${root}`}
      alt={`${name} portrait`}
      width={768}
      height={768}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`block object-cover ${className}`}
    />
  );
}
