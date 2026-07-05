import type { Metadata } from "next";
import { display, body, mono } from "./fonts";
import { Providers } from "@/providers/Providers";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tryheckle.xyz"),
  title: "Heckle — Personalities you own. Takes that live forever.",
  description:
    "AI fan personalities you own as ERC-7857 INFTs on 0G mainnet. Mint a heckler, attach it to live events, and watch its takes get committed to 0G Storage forever.",
  openGraph: {
    title: "Heckle — Personalities you own. Takes that live forever.",
    description:
      "AI fan personalities you own as ERC-7857 INFTs on 0G mainnet — takes logged to 0G Storage, reputation that travels with the character.",
    url: "https://tryheckle.xyz",
    siteName: "Heckle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Heckle — Personalities you own. Takes that live forever.",
    description: "AI fan personalities you own as ERC-7857 INFTs on 0G mainnet.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <Providers>
          <Nav />
          <main className="mx-auto w-full max-w-content px-4 py-8 overflow-x-clip">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
