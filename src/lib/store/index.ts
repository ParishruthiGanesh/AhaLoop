import "server-only";

import { isSupabaseConfigured } from "../config";
import { getSupabaseServerClient } from "../supabase/server";
import { DemoStore } from "./demo-store";
import { SupabaseStore } from "./supabase-store";
import type { Store } from "./types";

/**
 * Resolves the storage backend for the current request.
 * Supabase when configured, the in-memory demo store otherwise.
 */
export async function getStore(): Promise<Store> {
  if (isSupabaseConfigured) {
    const db = await getSupabaseServerClient();
    if (db) return new SupabaseStore(db);
  }
  return new DemoStore();
}

export type { Store };
export * from "./types";
