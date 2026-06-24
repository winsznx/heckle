"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { zeroGMainnet } from "@heckle/shared";

// Black/white, sharp-cornered theme so the connect + account modals match the
// newspaper-brutalist brand. RainbowKit's theme API takes literal color strings.
const heckleTheme = lightTheme({
  accentColor: "#000000",
  accentColorForeground: "#ffffff",
  borderRadius: "none",
  fontStack: "system",
  overlayBlur: "small",
});

// Fall back on empty string too (not just undefined) so prerender never hits
// RainbowKit's "No projectId found" throw. Injected wallets (MetaMask) work with
// the placeholder; set a real id from cloud.reown.com to enable WalletConnect.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "heckle_demo_placeholder";

const wagmiConfig = getDefaultConfig({
  appName: "Heckle",
  projectId,
  chains: [zeroGMainnet],
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={heckleTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
