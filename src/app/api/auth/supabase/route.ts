import { guard, ok, readJson, requireString } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

/**
 * Supabase email/password auth. Sign-up carries the chosen role in user
 * metadata, which the `handle_new_user` trigger copies into `profiles`.
 */
export async function POST(request: Request) {
  return guard(async () => {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured on this deployment.");
    }
    const db = await getSupabaseServerClient();
    if (!db) throw new Error("Supabase client unavailable.");

    const body = await readJson<{
      intent: "signin" | "signup";
      email: string;
      password: string;
      fullName?: string;
      role?: Role;
    }>(request);

    const email = requireString(body.email, "Email", { max: 200 });
    const password = requireString(body.password, "Password", {
      min: 6,
      max: 200,
    });

    if (body.intent === "signup") {
      const fullName = requireString(body.fullName, "Name", { max: 120 });
      const role: Role = body.role === "teacher" ? "teacher" : "student";

      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) throw new Error(error.message);

      if (!data.session) {
        return ok({
          needsEmailConfirmation: true,
          message:
            "Check your inbox to confirm your email, then sign in. (You can turn off email confirmation in Supabase → Authentication → Providers.)",
        });
      }
      return ok({ role, needsEmailConfirmation: false });
    }

    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const {
      data: { user },
    } = await db.auth.getUser();
    const role = (user?.user_metadata?.role as Role) ?? "student";
    return ok({ role, needsEmailConfirmation: false });
  });
}
