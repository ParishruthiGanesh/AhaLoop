"use client";

import { useCallback, useEffect, useState } from "react";

import { SourceTag } from "../mastery";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  cn,
} from "../ui";
import type { PerspectiveSet } from "@/lib/types";

/**
 * Stage 4b — PerspectiveLab.
 * The same concept from people whose work depends on it. A student who
 * bounced off the formal account often lands on the doctor's version.
 */
export function PerspectiveLab({
  concept,
  misconception,
}: {
  concept: string;
  misconception: string;
}) {
  const [set, setSet] = useState<PerspectiveSet | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/perspectives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ concept, misconception }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load perspectives.");
      setSet(data.perspectiveSet);
      setActiveId(data.perspectiveSet.perspectives[0]?.id ?? null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load perspectives.",
      );
    } finally {
      setLoading(false);
    }
  }, [concept, misconception]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = set?.perspectives.find((p) => p.id === activeId) ?? null;

  return (
    <Card>
      <CardHeader
        eyebrow="PerspectiveLab"
        title="Still not landing? Hear it from someone else"
        description="The same idea explained by people whose work depends on getting it right."
        action={set ? <SourceTag source={set.generatedBy} /> : null}
      />
      <CardBody className="space-y-4">
        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {loading && !set ? <LoadingBlock label="Gathering perspectives…" /> : null}

        {set && set.perspectives.length === 0 ? (
          <EmptyState
            icon="🔑"
            title="No perspectives for this topic yet"
            description="The built-in personas only speak about this build's sample lesson — accuracy, precision, recall and class imbalance. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local and they will be generated for any concept."
          />
        ) : null}

        {set && set.perspectives.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {set.perspectives.map((perspective) => (
                <button
                  key={perspective.id}
                  type="button"
                  onClick={() => setActiveId(perspective.id)}
                  aria-pressed={perspective.id === activeId}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                    perspective.id === activeId
                      ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span aria-hidden="true" className="text-[17px]">
                    {perspective.glyph}
                  </span>
                  <span>
                    <span className="block text-[13px] font-medium text-slate-900">
                      {perspective.persona}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {perspective.domain}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {active ? (
              <article className="animate-fade rounded-xl border border-slate-200 bg-white px-5 py-4.5">
                <p className="text-[15px] font-medium leading-snug text-slate-900">
                  &ldquo;{active.headline}&rdquo;
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-700">
                  {active.body}
                </p>
                {active.resource ? (
                  <a
                    href={active.resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:underline"
                  >
                    {active.resource.kind === "video" ? "▶" : "↗"}{" "}
                    {active.resource.title}
                  </a>
                ) : null}
              </article>
            ) : null}
          </>
        ) : null}

        {!loading && !set && !error ? (
          <Button variant="secondary" onClick={load}>
            Load perspectives
          </Button>
        ) : null}
      </CardBody>
    </Card>
  );
}
