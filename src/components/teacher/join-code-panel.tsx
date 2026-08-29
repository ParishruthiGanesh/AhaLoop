"use client";

import { useState } from "react";

import { Badge, Button, Card, CardBody } from "../ui";
import type { ClassSession, SessionStatus } from "@/lib/types";

export function JoinCodePanel({
  session,
  participantCount,
  onStatusChange,
}: {
  session: ClassSession;
  participantCount: number;
  onStatusChange: (status: SessionStatus) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(session.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be denied; the code is on screen either way.
      setCopied(false);
    }
  }

  async function setStatus(status: SessionStatus) {
    setBusy(true);
    try {
      await onStatusChange(status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/70">
              Students join at /join with
            </p>
            <p className="mt-1.5 font-mono text-[38px] font-semibold leading-none tracking-[0.16em]">
              {session.joinCode}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={copy}
            className="border-white/30 bg-white/15 text-white hover:border-white/50 hover:bg-white/25"
          >
            {copied ? "Copied" : "Copy code"}
          </Button>
        </div>
      </div>

      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Badge tone={session.status === "live" ? "green" : session.status === "lobby" ? "amber" : "neutral"}>
            {session.status === "live"
              ? "Live"
              : session.status === "lobby"
                ? "Lobby"
                : "Ended"}
          </Badge>
          <span className="text-[13px] text-slate-600">
            {participantCount} {participantCount === 1 ? "student" : "students"} joined
          </span>
        </div>

        <div className="flex gap-2">
          {session.status !== "live" ? (
            <Button size="sm" loading={busy} onClick={() => setStatus("live")}>
              Go live
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              onClick={() => setStatus("ended")}
            >
              End session
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
