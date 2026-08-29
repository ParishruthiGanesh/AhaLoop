import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const metadata: Metadata = { title: "Create account" };

export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "teacher" ? "/teacher" : "/student");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-md">
          <Logo />
        </Link>
        <Link
          href="/demo"
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900"
        >
          Skip to the demo
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <AuthForm intent="signup" supabaseEnabled={isSupabaseConfigured} />
      </div>
    </div>
  );
}
