import { cookies } from "next/headers";

import { guard, ok } from "@/lib/api";
import { DEMO_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  return guard(async () => {
    if (isSupabaseConfigured) {
      const db = await getSupabaseServerClient();
      await db?.auth.signOut();
    }
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_COOKIE);
    return ok({ signedOut: true });
  });
}
