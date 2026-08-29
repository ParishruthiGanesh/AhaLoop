"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  ErrorState,
  Field,
  Input,
  SuccessNote,
  cn,
} from "./ui";
import type { Role } from "@/lib/types";

/**
 * One form for both modes. With Supabase configured it does real email and
 * password auth; without it, it creates a local demo identity so the whole
 * product is still reachable.
 */
export function AuthForm({
  intent,
  supabaseEnabled,
}: {
  intent: "signin" | "signup";
  supabaseEnabled: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>("teacher");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = intent === "signup";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(
        supabaseEnabled ? "/api/auth/supabase" : "/api/auth/demo",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            supabaseEnabled
              ? { intent, email, password, fullName, role }
              : { email, fullName: fullName || email.split("@")[0], role },
          ),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not sign you in.");

      if (data.needsEmailConfirmation) {
        setNotice(data.message);
        return;
      }

      const destination =
        (data.role ?? data.profile?.role ?? role) === "teacher"
          ? "/teacher"
          : "/student";
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not sign you in.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-[19px] font-semibold tracking-[-0.015em] text-slate-900">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            {supabaseEnabled
              ? isSignUp
                ? "Choose how you'll use ThinkTrace. You can run a classroom or join one."
                : "Sign in to your classroom."
              : "Demo mode — no password needed. Your identity is stored locally for this browser."}
          </p>
        </div>

        {!supabaseEnabled ? (
          <Badge tone="amber">
            Demo mode · in-memory data, resets on server restart
          </Badge>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          {(isSignUp || !supabaseEnabled) && (
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-slate-700">
                I am a…
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(["teacher", "student"] as Role[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRole(option)}
                    aria-pressed={role === option}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      role === option
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
                        : "border-slate-300 bg-white hover:border-slate-400",
                    )}
                  >
                    <span className="block text-[14px] font-medium capitalize text-slate-900">
                      {option}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">
                      {option === "teacher"
                        ? "Run live sessions and read the confusion map"
                        : "Join with a code and get diagnosed"}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {(isSignUp || !supabaseEnabled) && (
            <Field label="Full name" htmlFor="fullName">
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Raman"
                autoComplete="name"
                required={supabaseEnabled}
              />
            </Field>
          )}

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              autoComplete="email"
              required
            />
          </Field>

          {supabaseEnabled ? (
            <Field
              label="Password"
              htmlFor="password"
              hint={isSignUp ? "At least 6 characters." : undefined}
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
                required
              />
            </Field>
          ) : null}

          {error ? <ErrorState message={error} /> : null}
          {notice ? <SuccessNote>{notice}</SuccessNote> : null}

          <Button type="submit" loading={busy} className="w-full" size="lg">
            {busy
              ? "Working…"
              : isSignUp
                ? "Create account"
                : supabaseEnabled
                  ? "Sign in"
                  : "Enter demo"}
          </Button>
        </form>

        <p className="text-center text-[13px] text-slate-500">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-600 hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="font-medium text-brand-600 hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </CardBody>
    </Card>
  );
}
