import { cookies } from "next/headers";

import { guard, ok, readJson, requireString } from "@/lib/api";
import { DEMO_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { getStore } from "@/lib/store";
import type { Role } from "@/lib/types";

/**
 * Demo-mode sign-in. Creates (or reuses) a local profile and sets a cookie.
 * Disabled entirely when Supabase is configured, so there is no bypass around
 * real authentication.
 */
export async function POST(request: Request) {
  return guard(async () => {
    if (isSupabaseConfigured) {
      throw new Error(
        "Supabase is configured — sign in with your email and password instead.",
      );
    }

    const body = await readJson<{
      email: string;
      fullName: string;
      role: Role;
    }>(request);

    const email = requireString(body.email, "Email", { max: 200 });
    const fullName = requireString(body.fullName, "Name", { max: 120 });
    const role: Role = body.role === "teacher" ? "teacher" : "student";

    const store = await getStore();
    const profile = await store.createDemoProfile({ email, fullName, role });

    const cookieStore = await cookies();
    cookieStore.set(DEMO_COOKIE, profile.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return ok({ profile });
  });
}
