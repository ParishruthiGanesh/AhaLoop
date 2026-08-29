import "server-only";

import {
  anthropicApiKey,
  anthropicBaseUrl,
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

const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 45_000);

export async function generateStructured<T>(args: {
  system: string;
  prompt: string;
  schemaName: string;
  schema: JsonSchema;
  validate: (value: unknown) => value is T;
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
    return args.validate(raw) ? raw : null;
  } catch (error) {
    console.error("[thinktrace] LLM call failed:", (error as Error)?.message);
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
      max_tokens: 8192,
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
    console.error("[thinktrace] Anthropic error", res.status, await safeText(res));
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
    console.error("[thinktrace] OpenAI error", res.status, await safeText(res));
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
