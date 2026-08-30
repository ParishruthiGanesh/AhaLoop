"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LiveSnapshot } from "@/lib/types";

type Status = "loading" | "ready" | "error";

/**
 * Keeps a session snapshot fresh for both dashboards.
 *
 * Polling is the baseline and always runs, so the demo backend behaves
 * identically to the real one. When Supabase is configured, Realtime change
 * events additionally trigger an immediate refetch, which is what makes
 * responses appear on the teacher's screen the moment they are submitted.
 */
export function useLiveSession(
  sessionId: string,
  initial?: LiveSnapshot | null,
  { pollMs = 3000 }: { pollMs?: number } = {},
) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(initial ?? null);
  const [status, setStatus] = useState<Status>(initial ? "ready" : "loading");
  const [error, setError] = useState<string | null>(null);
  const revisionRef = useRef<number>(initial?.revision ?? -1);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/live/${sessionId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load the session.");

      // Skip the state update when nothing changed, so the dashboard doesn't
      // re-render (and lose focus/scroll) on every poll.
      if (data.revision !== revisionRef.current) {
        revisionRef.current = data.revision;
        setSnapshot(data as LiveSnapshot);
      }
      setStatus("ready");
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load the session.",
      );
      setStatus((prev) => (prev === "ready" ? "ready" : "error"));
    } finally {
      inFlight.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, pollMs);
    return () => clearInterval(timer);
  }, [refresh, pollMs]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `session_id=eq.${sessionId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mastery", filter: `session_id=eq.${sessionId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, refresh]);

  return { snapshot, status, error, refresh };
}
