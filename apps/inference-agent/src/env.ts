import "dotenv/config";
import { ZG_RPC_URL, ZG_STORAGE_INDEXER } from "@heckle/shared";

export interface AgentEnv {
  AGENT_PRIVATE_KEY?: string;
  ZG_RPC_URL: string;
  ZG_STORAGE_INDEXER: string;
  HECKLE_CHARACTERS?: string;
  HECKLE_EVENTS?: string;
  HECKLE_TAKES?: string;
  HECKLE_RESOLVER?: string;
  FOOTBALL_DATA_TOKEN?: string;
  ZG_COMPUTE_PROVIDER?: string;
  ZG_COMPUTE_MODEL?: string;
}

export const env: AgentEnv = {
  AGENT_PRIVATE_KEY: process.env.AGENT_PRIVATE_KEY,
  ZG_RPC_URL: process.env.ZG_RPC_URL || ZG_RPC_URL,
  ZG_STORAGE_INDEXER: process.env.ZG_STORAGE_INDEXER || ZG_STORAGE_INDEXER,
  HECKLE_CHARACTERS: process.env.HECKLE_CHARACTERS,
  HECKLE_EVENTS: process.env.HECKLE_EVENTS,
  HECKLE_TAKES: process.env.HECKLE_TAKES,
  HECKLE_RESOLVER: process.env.HECKLE_RESOLVER,
  FOOTBALL_DATA_TOKEN: process.env.FOOTBALL_DATA_TOKEN,
  ZG_COMPUTE_PROVIDER: process.env.ZG_COMPUTE_PROVIDER,
  ZG_COMPUTE_MODEL: process.env.ZG_COMPUTE_MODEL,
};

/** Env vars required for the agent to commit takes on-chain. */
const REQUIRED_KEYS = [
  "AGENT_PRIVATE_KEY",
  "HECKLE_CHARACTERS",
  "HECKLE_EVENTS",
  "HECKLE_TAKES",
] as const;

export interface ResolvedEnv extends AgentEnv {
  AGENT_PRIVATE_KEY: string;
  HECKLE_CHARACTERS: string;
  HECKLE_EVENTS: string;
  HECKLE_TAKES: string;
}

/**
 * Validate that every runtime-required env var is present and return a narrowed
 * env. Throws a clear, actionable error otherwise. Call this at runtime (inside
 * `main`/`seed`), never at import time — so `tsc`/imports stay side-effect-free.
 */
export function requireEnv(): ResolvedEnv {
  const missing = REQUIRED_KEYS.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}.\n` +
        `Set them in apps/inference-agent/.env (see .env.example).`,
    );
  }

  return env as ResolvedEnv;
}
