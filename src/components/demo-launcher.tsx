"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, CardBody, ErrorState, cn } from "./ui";

/**
 * One-click entry into the seeded classroom. In demo mode it also signs the
 * visitor in as the relevant persona so the whole flow is reachable without
 * setting up accounts.
 */
export function DemoLauncher({ supabaseEnabled }: { supabaseEnabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"teacher" | "student" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function seed(as: "teacher" | "student") {
    setBusy(as);
    setError(null);
    try {
      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ as }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start the demo.");
      router.replace(data.redirectTo);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not start the demo.",
      );
      setBusy(null);
    }
  }

  async function reset() {
    setBusy("reset");
    setError(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not reset.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reset.");
    } finally {
      setBusy(null);
    }
  }

  const roles = [
    {
      key: "teacher" as const,
      title: "Enter as the teacher",
      persona: "Dr Priya Raman",
      body: "Open the live control room with five student responses already in. Run LecturePulse and read the confusion map.",
      accent: "from-brand-500 to-brand-700",
    },
    {
      key: "student" as const,
      title: "Enter as a student",
      persona: "Aarav Menon",
      body: "Step into a student who answered incorrectly, and walk the full ConceptLens journey through to teach-back.",
      accent: "from-violet-500 to-violet-700",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.key} className="flex flex-col">
            <CardBody className="flex flex-1 flex-col">
              <span
                aria-hidden="true"
                className={cn(
                  "mb-4 h-1 w-10 rounded-full bg-gradient-to-r",
                  role.accent,
                )}
              />
              <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">
                {role.title}
              </h3>
              <p className="mt-1 text-[12.5px] font-medium text-slate-500">
                as {role.persona}
              </p>
              <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-slate-600">
                {role.body}
              </p>
              <Button
                className="mt-5 w-full"
                loading={busy === role.key}
                disabled={busy !== null && busy !== role.key}
                onClick={() => seed(role.key)}
                variant={role.key === "teacher" ? "primary" : "secondary"}
              >
                {busy === role.key ? "Preparing classroom…" : role.title}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      {error ? <ErrorState message={error} /> : null}

      {supabaseEnabled ? (
        <Badge tone="sky">
          Supabase is configured — seeding needs you to be signed in as a
          teacher, and it will not switch your identity.
        </Badge>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3">
          <p className="text-[12.5px] text-slate-500">
            Demo data lives in memory. Reset it to start the walkthrough again
            from a clean slate.
          </p>
          <Button
            variant="ghost"
            size="sm"
            loading={busy === "reset"}
            onClick={reset}
          >
            Reset demo data
          </Button>
        </div>
      )}
    </div>
  );
}
