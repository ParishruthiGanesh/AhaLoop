import Link from "next/link";

import { LogoLink } from "./brand";
import { Badge, cn } from "./ui";
import { SignOutButton } from "./sign-out-button";
import type { ModeInfo } from "@/lib/config";
import type { Profile } from "@/lib/types";

/** Top-level chrome: brand, contextual nav, mode indicator, identity. */
export function AppShell({
  user,
  mode,
  nav,
  children,
}: {
  user: Profile | null;
  mode: ModeInfo;
  nav?: { href: string; label: string; active?: boolean }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <LogoLink href={user?.role === "teacher" ? "/teacher" : "/student"} />

          {nav && nav.length > 0 ? (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                    item.active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className="ml-auto flex items-center gap-2.5">
            <ModeIndicator mode={mode} />
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right sm:block">
                  <div className="text-[13px] font-medium leading-tight text-slate-800">
                    {user.fullName || user.email}
                  </div>
                  <div className="text-[11px] capitalize leading-tight text-slate-500">
                    {user.role}
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-[12px] font-semibold text-brand-700"
                >
                  {initials(user.fullName || user.email)}
                </span>
                <SignOutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {nav && nav.length > 0 ? (
          <nav
            className="scroll-slim flex gap-1 overflow-x-auto border-t border-slate-200/70 px-4 py-1.5 md:hidden"
            aria-label="Main"
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium",
                  item.active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12px] text-slate-500 sm:px-6">
          <span>
            ThinkTrace AI — don&rsquo;t just mark the wrong answer, understand the
            thinking behind it.
          </span>
          <Link href="/about" className="hover:text-slate-700">
            How it works
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function ModeIndicator({ mode }: { mode: ModeInfo }) {
  const live = mode.supabase && mode.llm;
  if (live) {
    return (
      <span className="hidden sm:block">
        <Badge tone="green">
          <Dot className="bg-emerald-500" />
          Connected
        </Badge>
      </span>
    );
  }

  const detail = [
    mode.supabase ? "Supabase connected" : "in-memory store",
    mode.llm ? `${mode.llmProvider} connected` : "demo analyzer",
  ].join(" · ");

  return (
    <span className="hidden sm:block">
      <Badge tone="amber">
        <Dot className="bg-amber-500" />
        <span title={detail}>Demo mode</span>
      </Badge>
    </span>
  );
}

function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 rounded-full", className)}
    />
  );
}

function initials(name: string) {
  const parts = name.trim().split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
