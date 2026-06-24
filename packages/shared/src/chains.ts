import { defineChain } from "viem";

export const ZG_MAINNET_ID = 16661 as const;
export const ZG_TESTNET_ID = 16602 as const;

/**
 * 0G mainnet ("Aristotle"). Hand-rolled instead of viem/chains because viem
 * ships multiple stale 0G definitions (one testnet pinned to 16601). Verified
 * against docs.0g.ai + chainlist (Jun 2026).
 */
export const zeroGMainnet = defineChain({
  id: ZG_MAINNET_ID,
  name: "0G Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc.0g.ai"] } },
  blockExplorers: {
    default: { name: "0G Chainscan", url: "https://chainscan.0g.ai" },
  },
  testnet: false,
});

/** 0G Galileo testnet — current chainId is 16602 (NOT the stale 16601). */
export const zeroGTestnet = defineChain({
  id: ZG_TESTNET_ID,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
  blockExplorers: {
    default: { name: "0G Chainscan (Galileo)", url: "https://chainscan-galileo.0g.ai" },
  },
  testnet: true,
});

export function assertZeroGMainnet(chainId: number): void {
  if (chainId !== ZG_MAINNET_ID) {
    throw new Error(`Expected 0G mainnet (${ZG_MAINNET_ID}), got ${chainId}`);
  }
}
