"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  Input,
} from "../ui";

export function JoinForm({ autoFocus = true }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, anonymous }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join.");
      router.push(`/student/session/${data.session.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join.");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Join a classroom"
        title="Enter your join code"
        description="Your teacher has it on screen. Six characters, letters and numbers."
      />
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Join code" htmlFor="code">
            <Input
              id="code"
              value={code}
              autoFocus={autoFocus}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              className="text-center font-mono text-[24px] font-semibold tracking-[0.3em]"
            />
          </Field>

          <label className="flex items-center gap-2.5 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="size-4 rounded accent-brand-600"
            />
            Hide my name from the teacher&rsquo;s screen
          </label>

          {error ? <ErrorState message={error} /> : null}

          <Button
            type="submit"
            loading={busy}
            className="w-full"
            size="lg"
            disabled={code.trim().length < 4}
          >
            {busy ? "Joining…" : "Join classroom"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
