import Image from "next/image";

const PORTRAITS: Record<string, string> = {
  "0": "/characters/0.avif",
  "3": "/characters/3.avif",
  "4": "/characters/4.avif",
};

export function hasPortrait(tokenId: string | number): boolean {
  return String(tokenId) in PORTRAITS;
}

interface CharacterPortraitProps {
  tokenId: string | number;
  name: string;
  className?: string;
  priority?: boolean;
}

export function CharacterPortrait({
  tokenId,
  name,
  className = "",
  priority = false,
}: CharacterPortraitProps) {
  const src = PORTRAITS[String(tokenId)];
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={`${name} portrait`}
      width={768}
      height={768}
      unoptimized
      priority={priority}
      className={`block object-cover ${className}`}
    />
  );
}
