import localFont from "next/font/local";

// Self-hosted (public/fonts) — never next/font/google. Variables are bridged
// into Tailwind tokens via @theme inline in globals.css (--ff-* -> --font-*).

export const display = localFont({
  src: [
    { path: "../../public/fonts/fraunces-700.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/fraunces-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--ff-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const body = localFont({
  src: [
    { path: "../../public/fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/inter-500.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/inter-600.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/inter-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--ff-body",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const mono = localFont({
  src: [
    { path: "../../public/fonts/jetbrains-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/jetbrains-mono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--ff-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});
