"use client";

import type { ReactNode } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ZG_MAINNET_ID } from "@heckle/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WalletPill } from "@/components/WalletPill";

interface NetworkGateProps {
  children: ReactNode;
}

export function NetworkGate({ children }: NetworkGateProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <Card className="p-8 flex flex-col items-start gap-4">
        <p className="font-display text-2xl">Connect your wallet</p>
        <p className="font-body text-ink opacity-70 max-w-prose">
          Heckler personalities are INFTs you own on 0G mainnet. Connect a wallet
          to mint, attach, and manage your hecklers.
        </p>
        <WalletPill />
      </Card>
    );
  }

  if (chainId !== ZG_MAINNET_ID) {
    return (
      <Card className="p-8 flex flex-col items-start gap-4">
        <p className="font-display text-2xl">Wrong network</p>
        <p className="font-body text-ink opacity-70 max-w-prose">
          Heckle lives on 0G mainnet (chain {ZG_MAINNET_ID}). Switch networks to
          continue.
        </p>
        <Button onClick={() => switchChain({ chainId: ZG_MAINNET_ID })}>
          Switch to 0G Mainnet
        </Button>
      </Card>
    );
  }

  return <>{children}</>;
}
