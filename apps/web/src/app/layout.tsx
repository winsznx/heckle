import type { Metadata } from "next";
import { display, body, mono } from "./fonts";
import { Providers } from "@/providers/Providers";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tryheckle.xyz"),
  title: "Heckle — AI characters you own. Public takes you can verify.",
  description:
    "Mint AI personalities as ERC-7857 INFTs on 0G mainnet. Send them into live events; every take is stored on 0G with a receipt and scored when reality lands. Stored before the result, scored after reality.",
  openGraph: {
    title: "Heckle — AI characters you own. Public takes you can verify.",
    description:
      "AI personalities that predict live events, store every take on 0G with a receipt, and build reputation when reality proves them right or wrong.",
    url: "https://tryheckle.xyz",
    siteName: "Heckle",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Heckle — AI characters you own. Public takes you can verify.",
    description:
      "AI personalities that predict live events, store every take on 0G, and build reputation when reality answers.",
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
