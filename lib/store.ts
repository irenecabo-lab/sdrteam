import fs from "node:fs/promises";
import path from "node:path";
import type { CompetitionSnapshot } from "@/lib/types";

// A plain JSON file is enough for a self-hosted / traditional Node deploy
// (Docker, a small VM, `next start` on a persistent box) - the target this
// project assumes. On a stateless serverless platform (e.g. plain Vercel
// functions without a KV/DB attached) this file will NOT reliably persist
// between invocations - swap this module for a real store (Vercel KV,
// Postgres, etc.) if you deploy there. See README.md.
const CACHE_DIR = path.join(process.cwd(), ".data");
const CACHE_FILE = path.join(CACHE_DIR, "snapshot-cache.json");

export async function readCachedSnapshot(): Promise<CompetitionSnapshot | null> {
  try {
    const text = await fs.readFile(CACHE_FILE, "utf-8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function writeCachedSnapshot(snapshot: CompetitionSnapshot): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}

export interface OverrideLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  description: string;
}

const OVERRIDE_LOG_FILE = path.join(CACHE_DIR, "override-log.json");

export async function readOverrideLog(): Promise<OverrideLogEntry[]> {
  try {
    const text = await fs.readFile(OVERRIDE_LOG_FILE, "utf-8");
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export async function appendOverrideLog(entry: OverrideLogEntry): Promise<void> {
  const log = await readOverrideLog();
  log.unshift(entry);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(OVERRIDE_LOG_FILE, JSON.stringify(log.slice(0, 500), null, 2), "utf-8");
}
