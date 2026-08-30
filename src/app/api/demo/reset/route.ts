import { cookies } from "next/headers";

import { guard, ok } from "@/lib/api";
import { DEMO_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { resetDemoData } from "@/lib/store/demo-store";

/** Clears all in-memory demo data. Unavailable when Supabase is configured. */
export async function POST() {
  return guard(async () => {
    if (isSupabaseConfigured) {
      throw new Error(
        "Reset only clears in-memory demo data, and this deployment uses Supabase.",
      );
    }
    resetDemoData();
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_COOKIE);
    return ok({ reset: true });
  });
}
