import "server-only";

import { NextResponse } from "next/server";

import { AuthError } from "./auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a route handler so every failure becomes a JSON error the client can
 * render, rather than an unhandled 500 with an empty body.
 */
export async function guard(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    console.error("[thinktrace] route error:", message);
    return fail(message, 500);
  }
}

/** Reads a JSON body, returning `{}` rather than throwing on malformed input. */
export async function readJson<T extends object>(
  request: Request,
): Promise<Partial<T>> {
  try {
    const body = await request.json();
    return typeof body === "object" && body !== null ? (body as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function requireString(
  value: unknown,
  field: string,
  { max = 5000, min = 1 }: { max?: number; min?: number } = {},
): string {
  if (typeof value !== "string") throw new Error(`${field} is required.`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw new Error(`${field} is required.`);
  if (trimmed.length > max) {
    throw new Error(`${field} must be under ${max} characters.`);
  }
  return trimmed;
}
