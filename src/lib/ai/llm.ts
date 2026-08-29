import "server-only";

import {
  anthropicApiKey,
  anthropicBaseUrl,
  anthropicEffort,
  anthropicModel,
  isLlmConfigured,
  llmProvider,
  openaiApiKey,
  openaiBaseUrl,
  openaiModel,
} from "../config";

/**
 * Minimal structured-output client.
 *
 * Both providers are asked for a JSON object matching an explicit schema —
 * Anthropic via a forced tool call, OpenAI via `json_schema` response format.
 * Every call is guarded: a network error, a timeout or malformed JSON returns
 * `null`, and the caller falls back to the deterministic demo analyzer rather
 * than showing the user a broken screen.
 *
 * API keys are read here and only here, in a server-only module.
 */

export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties?: boolean;
}

const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 60_000);

/**
 * The last provider failure, so the UI can tell the user what actually went
 * wrong instead of making them read the server log. Only the provider's own
 * message is kept — never the request, which would carry the API key.
 */
let lastProviderError: string | null = null;

export function getLastProviderError(): string | null {
  return lastProviderError;
}

function recordProviderError(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    lastProviderError = parsed.error?.message ?? raw;
  } catch {
    lastProviderError = raw;
  }
  lastProviderError = lastProviderError.slice(0, 300);
}

export async function generateStructured<T>(args: {
  system: string;
  prompt: string;
  schemaName: string;
  schema: JsonSchema;
  /**
   * Coerce the raw payload into the shape the caller needs, or return null if
   * it is genuinely unusable. Deliberately a parser rather than a predicate:
   * a good answer missing one decorative field should be salvaged, not
   * discarded.
   */
  parse: (value: unknown) => T | null;
}): Promise<T | null> {
  if (!isLlmConfigured) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const raw =
      llmProvider === "anthropic"
        ? await callAnthropic(args, controller.signal)
        : await callOpenAI(args, controller.signal);

    if (raw == null) return null;

    const parsed = args.parse(raw);
    if (parsed == null) {
      const keys =
        typeof raw === "object" && raw !== null
          ? Object.keys(raw as Record<string, unknown>).join(", ")
          : typeof raw;
      lastProviderError =
        "The model replied, but the response was missing the parts this screen needs.";
      console.error(
        `[thinktrace] unusable ${args.schemaName} payload; keys received: ${keys}`,
      );
      return null;
    }
    lastProviderError = null;
    return parsed;
  } catch (error) {
    const message = (error as Error)?.message ?? "unknown error";
    lastProviderError =
      (error as Error)?.name === "AbortError"
        ? `The model did not respond within ${Math.round(TIMEOUT_MS / 1000)}s.`
        : message;
    console.error("[thinktrace] LLM call failed:", message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(
  args: { system: string; prompt: string; schemaName: string; schema: JsonSchema },
  signal: AbortSignal,
): Promise<unknown> {
  const res = await fetch(`${anthropicBaseUrl}/v1/messages`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 16_000,
      output_config: { effort: anthropicEffort },
      system: args.system,
      tools: [
        {
          name: args.schemaName,
          description: "Return the structured analysis.",
          input_schema: args.schema,
        },
      ],
      tool_choice: { type: "tool", name: args.schemaName },
      messages: [{ role: "user", content: args.prompt }],
    }),
  });

  if (!res.ok) {
    const body = await safeText(res);
    recordProviderError(body);
    console.error("[thinktrace] Anthropic error", res.status, body);
    return null;
  }

  const data = (await res.json()) as {
    content?: { type: string; input?: unknown }[];
  };
  const toolUse = data.content?.find((block) => block.type === "tool_use");
  return toolUse?.input ?? null;
}

async function callOpenAI(
  args: { system: string; prompt: string; schemaName: string; schema: JsonSchema },
  signal: AbortSignal,
): Promise<unknown> {
  const res = await fetch(`${openaiBaseUrl}/v1/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: args.schemaName,
          strict: false,
          schema: args.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await safeText(res);
    recordProviderError(body);
    console.error("[thinktrace] OpenAI error", res.status, body);
    return null;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function safeText(res: globalThis.Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "<unreadable>";
  }
}
