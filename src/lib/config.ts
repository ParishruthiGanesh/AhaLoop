/**
 * Runtime configuration.
 *
 * ThinkTrace runs in two modes and the UI always says which one it is in:
 *
 *  - Connected mode: Supabase for auth/data/realtime, an LLM for analysis.
 *  - Demo mode: an in-memory store plus the deterministic demo analyzer.
 *
 * The two are independent — you can run Supabase without an LLM key, or an
 * LLM key without Supabase.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Server-only. Never import these into a client component. */
export const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim() || "";
export const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || "";

export const llmProvider: "anthropic" | "openai" | "none" = anthropicApiKey
  ? "anthropic"
  : openaiApiKey
    ? "openai"
    : "none";

export const isLlmConfigured = llmProvider !== "none";

/**
 * Optional API base overrides, for a corporate gateway, a proxy, or a local
 * mock during testing. Default to the providers' own endpoints.
 */
export const anthropicBaseUrl =
  process.env.ANTHROPIC_BASE_URL?.trim().replace(/\/$/, "") ||
  "https://api.anthropic.com";
export const openaiBaseUrl =
  process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") ||
  "https://api.openai.com";

export const anthropicModel =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5";

/**
 * How hard the model works per request. ThinkTrace is interactive — a student
 * is watching a spinner — so this trades some depth for a response that
 * arrives while they are still looking at the screen. Raise to "high" if you
 * care more about the analysis than the wait.
 */
export const anthropicEffort = process.env.ANTHROPIC_EFFORT?.trim() || "medium";
export const openaiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

export interface ModeInfo {
  supabase: boolean;
  llm: boolean;
  llmProvider: string;
}

export function getModeInfo(): ModeInfo {
  return {
    supabase: isSupabaseConfigured,
    llm: isLlmConfigured,
    llmProvider,
  };
}
