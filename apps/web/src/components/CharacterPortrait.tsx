import Image from "next/image";
import { GatewayPortrait } from "@/components/GatewayPortrait";

/** Repo-bundled AVIF for the seeded hecklers — fast, reliable hero rendering. */
const PORTRAITS: Record<string, string> = {
  "0": "/characters/0.avif",
  "3": "/characters/3.avif",
  "4": "/characters/4.avif",
  "5": "/characters/5.avif",
  "6": "/characters/6.avif",
  "7": "/characters/7.avif",
};

/** The same portraits, content-addressed on 0G Storage — independently verifiable. */
const PORTRAIT_ROOTS: Record<string, string> = {
  "0": "0x8698ab864319b8b5797c7007d2bee3c817266eaeb1c73a91c691a0467f709825",
  "3": "0xb07cad2324c9b4f4aebb972b133e11ae8b3b152fc5ed138c4a088317d716898c",
  "4": "0x0ac19b075b005f1ca9e31843a6c1d706a3f17cdafe2bbe7a75045e4e5adfbe9c",
  "5": "0x6a808dd0724696769e39abcea31c666aac6ecd04a956fead974719a543936ea5",
  "6": "0xac2b1177df72636497c8fee2119dd281681dbf630b19b2bc3445cd064bdc937c",
  "7": "0xc7f54c50813350e812116454078547ceced747b9bed4353d578c32f0f094e5f0",
};

export function hasPortrait(tokenId: string | number): boolean {
  return String(tokenId) in PORTRAITS;
}

/** 0G Storage root for a seeded portrait, if it has one. */
export function portraitRoot(tokenId: string | number): string | null {
  return PORTRAIT_ROOTS[String(tokenId)] ?? null;
}

interface CharacterPortraitProps {
  tokenId: string | number;
  name: string;
  /** For user-created characters: a 0G Storage root to render from the gateway. */
  imageRoot?: string | null;
  className?: string;
  priority?: boolean;
}

export function CharacterPortrait({
  tokenId,
  name,
  imageRoot,
  className = "",
  priority = false,
}: CharacterPortraitProps) {
  const local = PORTRAITS[String(tokenId)];

  // Seeded hecklers: render the fast, bundled AVIF.
  if (local) {
    return (
      <Image
        src={local}
        alt={`${name} portrait`}
        width={768}
        height={768}
        unoptimized
        priority={priority}
        className={`block object-cover ${className}`}
      />
    );
  }

  // User-created characters: render straight from 0G Storage by root, with a
  // graceful placeholder if the gateway 404s or the indexer hasn't propagated yet.
  if (imageRoot) {
    return <GatewayPortrait root={imageRoot} name={name} className={className} />;
  }

  return null;
}
