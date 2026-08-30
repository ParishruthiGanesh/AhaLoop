import "server-only";

import { cookies } from "next/headers";

import { isSupabaseConfigured } from "./config";
import { getStore } from "./store";
import { getSupabaseServerClient } from "./supabase/server";
import type { Profile, Role } from "./types";

export const DEMO_COOKIE = "thinktrace_demo_user";

/**
 * The signed-in user for the current request.
 *
 * In connected mode this is the Supabase Auth user joined to their profile
 * row. In demo mode it is a lightweight cookie-scoped identity — enough to
 * keep teacher and student sessions genuinely separate in one browser
 * (use two windows, or two profiles) without standing up an auth server.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  if (isSupabaseConfigured) {
    const db = await getSupabaseServerClient();
    if (!db) return null;
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return null;

    const store = await getStore();
    const profile = await store.getProfile(user.id);
    if (profile) return profile;

    // Profile row missing (trigger not installed) — synthesise from metadata.
    return {
      id: user.id,
      email: user.email ?? "",
      fullName: (user.user_metadata?.full_name as string) ?? "",
      role: ((user.user_metadata?.role as Role) ?? "student") as Role,
    };
  }

  const cookieStore = await cookies();
  const id = cookieStore.get(DEMO_COOKIE)?.value;
  if (!id) return null;
  const store = await getStore();
  return store.getProfile(id);
}

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("You need to sign in to do that.", 401);
  return user;
}

export async function requireRole(role: Role): Promise<Profile> {
  const user = await requireUser();
  if (user.role !== role) {
    throw new AuthError(`This action is only available to ${role}s.`, 403);
  }
  return user;
}

/** Signed out is 401; signed in but not permitted is 403. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 = 401,
  ) {
    super(message);
  }
}

/**
 * Only a session's teacher and its participants may read its data.
 * Supabase enforces this in RLS as well; this keeps the demo backend honest.
 */
export async function assertSessionMember(
  user: Profile,
  session: { id: string; teacherId: string },
  findParticipant: (sessionId: string, userId: string) => Promise<unknown>,
): Promise<void> {
  if (session.teacherId === user.id) return;
  const participant = await findParticipant(session.id, user.id);
  if (!participant) {
    throw new AuthError("You are not part of this classroom.", 403);
  }
}
