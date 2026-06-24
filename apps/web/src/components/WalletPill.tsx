"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId, useSwitchChain } from "wagmi";
import { ZG_MAINNET_ID } from "@heckle/shared";
import { truncateAddr } from "@/lib/format";

export function WalletPill() {
  const activeChainId = useChainId();
  const { switchChain } = useSwitchChain();

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openConnectModal, openAccountModal }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <span
              aria-hidden
              className="inline-flex items-center border border-rule px-3 py-1 font-mono text-xs uppercase tracking-wide opacity-40"
            >
              ····
            </span>
          );
        }

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className="inline-flex items-center gap-2 border border-rule bg-ink text-paper px-3 py-1 font-mono text-xs uppercase tracking-wide transition-transform hover:-translate-y-px"
            >
              Connect
            </button>
          );
        }

        const wrongChain = chain.unsupported || chain.id !== ZG_MAINNET_ID;

        if (wrongChain) {
          return (
            <button
              type="button"
              onClick={() => switchChain({ chainId: ZG_MAINNET_ID })}
              className="inline-flex items-center gap-2 border border-rule bg-ink text-paper px-3 py-1 font-mono text-xs uppercase tracking-wide transition-transform hover:-translate-y-px"
            >
              Switch to 0G Mainnet
            </button>
          );
        }

        return (
          <button
            type="button"
            onClick={openAccountModal}
            className="inline-flex items-center gap-2 border border-rule bg-paper text-ink px-3 py-1 font-mono text-xs uppercase tracking-wide transition-transform hover:-translate-y-px"
          >
            <span aria-hidden className="inline-block w-2 h-2 bg-ink rounded-full" />
            {truncateAddr(account.address)}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
