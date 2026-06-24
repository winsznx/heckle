import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Root-level OG image → inherited by every route. Satori renders inline styles
// (no Tailwind/tokens), so literal brand colors are required here.
export const runtime = "nodejs";
export const alt = "Heckle — Personalities you own. Takes that live forever.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#000000";
const PAPER = "#ffffff";

export default async function Image() {
  const [fraunces, inter] = await Promise.all([
    readFile(join(process.cwd(), "public/fonts/fraunces-900.woff")),
    readFile(join(process.cwd(), "public/fonts/inter-600.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          color: INK,
          padding: 56,
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            letterSpacing: 3,
          }}
        >
          <span>ERC-7857 INFT</span>
          <span>0G MAINNET</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Fraunces", fontSize: 168, lineHeight: 1 }}>Heckle.</div>
          <div style={{ fontSize: 42, marginTop: 8 }}>
            Personalities you own. Takes that live forever.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, letterSpacing: 1 }}>
          AI fan personalities · TEE-attested takes · 0G Storage
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 900, style: "normal" },
        { name: "Inter", data: inter, weight: 600, style: "normal" },
      ],
    },
  );
}
