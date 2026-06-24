import { storageUri } from "@heckle/shared";

export interface PersonalityBlob {
  name?: string;
  handle?: string;
  archetype?: string;
  personalityBrief?: string;
  palette?: number;
  createdAt?: number;
  creator?: string;
  [key: string]: unknown;
}

export interface TakeBlob {
  text?: string;
  kind?: string;
  characterId?: string;
  eventId?: string;
  triggerId?: string;
  createdAt?: number;
  [key: string]: unknown;
}

export async function fetchBlob<T = unknown>(root: string): Promise<T | null> {
  if (!root || root === "0x" + "0".repeat(64)) return null;
  try {
    const res = await fetch(storageUri(root), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
