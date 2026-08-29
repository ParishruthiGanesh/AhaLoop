"use client";

import { useState } from "react";

import { MasteryPill, SourceTag } from "../mastery";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Textarea,
  cn,
} from "../ui";
import type { TeachBackEvaluation } from "@/lib/types";

/**
 * Stage 5 — teach-back verification.
 * The only exit from the cycle. The evaluation asks whether the *original*
 * misconception is gone, not whether the answer looks like the textbook.
 */
export function TeachBack({
  diagnosisId,
  prompt,
  onResolved,
}: {
  diagnosisId: string;
  prompt: string;
  onResolved: (evaluation: TeachBackEvaluation) => void;
}) {
  const [text, setText] = useState("");
  const [evaluation, setEvaluation] = useState<TeachBackEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/teachback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ diagnosisId, text, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not evaluate your explanation.");
      setEvaluation(data.evaluation);
      setAttempts((n) => n + 1);
      onResolved(data.evaluation);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not evaluate your explanation.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Teach-back verification"
        title="Explain it in your own words"
        description="This is what closes the loop. Not a multiple-choice question — an explanation, checked against the misconception you started with."
        action={
          attempts > 0 ? (
            <Badge>
              Attempt {attempts}
            </Badge>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        <section className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-brand-700">
            Your task
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate-800">
            {prompt}
          </p>
        </section>

        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write it as if you're explaining to a classmate who missed the lesson…"
          maxLength={5000}
          aria-label="Your explanation"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            loading={busy}
            disabled={text.trim().length < 10}
            onClick={submit}
          >
            {evaluation ? "Submit a revised explanation" : "Submit my explanation"}
          </Button>
          <span className="text-[12px] text-slate-500">
            {text.trim().split(/\s+/).filter(Boolean).length} words
          </span>
        </div>

        {error ? <ErrorState message={error} onRetry={submit} /> : null}

        {evaluation ? (
          <EvaluationReport evaluation={evaluation} />
        ) : null}
      </CardBody>
    </Card>
  );
}

function EvaluationReport({ evaluation }: { evaluation: TeachBackEvaluation }) {
  return (
    <section
      className={cn(
        "animate-rise space-y-4 rounded-xl border px-4 py-4",
        evaluation.resolved
          ? "border-emerald-200 bg-emerald-50/70"
          : "border-amber-200 bg-amber-50/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold text-slate-900">
          {evaluation.resolved
            ? "Misconception resolved"
            : evaluation.misconceptionStillPresent
              ? "The original misconception is still there"
              : "Nearly — something is still missing"}
        </span>
        <MasteryPill state={evaluation.masteryState} showMeaning />
        <SourceTag source={evaluation.generatedBy} />
      </div>

      <p className="text-[13.5px] leading-relaxed text-slate-800">
        {evaluation.feedback}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Checklist
          title="Your explanation established"
          items={evaluation.conceptsCovered}
          tone="green"
          emptyLabel="Nothing yet"
        />
        <Checklist
          title="Still missing"
          items={evaluation.conceptsMissing}
          tone="rose"
          emptyLabel="Nothing — it's complete"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={evaluation.canTransfer ? "green" : "neutral"}>
          {evaluation.canTransfer
            ? "Applied it beyond the original example"
            : "Still anchored to the original example"}
        </Badge>
        <Badge tone={evaluation.appearsMemorised ? "amber" : "neutral"}>
          {evaluation.appearsMemorised
            ? "Reads as recalled phrasing"
            : "Reads as your own reasoning"}
        </Badge>
        <Badge tone="brand">Score {evaluation.score}/100</Badge>
      </div>

      <div className="rounded-lg bg-white/80 px-3.5 py-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
          Next step
        </h4>
        <p className="mt-1 text-[13.5px] leading-relaxed text-slate-800">
          {evaluation.nextStep}
        </p>
      </div>
    </section>
  );
}

function Checklist({
  title,
  items,
  tone,
  emptyLabel,
}: {
  title: string;
  items: string[];
  tone: "green" | "rose";
  emptyLabel: string;
}) {
  return (
    <div className="rounded-lg bg-white/80 px-3.5 py-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-1 text-[12.5px] text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-[12.5px] leading-snug text-slate-700"
            >
              <span
                aria-hidden="true"
                className={tone === "green" ? "text-emerald-600" : "text-rose-500"}
              >
                {tone === "green" ? "✓" : "•"}
              </span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
