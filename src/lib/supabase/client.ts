"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfiguredInBrowser = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client, used only for Realtime subscriptions on the
 * teacher dashboard. Returns null in demo mode, where the dashboard falls
 * back to polling.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!supabaseConfiguredInBrowser) return null;
  if (!cached) cached = createBrowserClient(url, anonKey);
  return cached;
}
