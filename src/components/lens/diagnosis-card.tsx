"use client";

import { useState } from "react";

import { SourceTag } from "../mastery";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  cn,
} from "../ui";
import type { Diagnosis } from "@/lib/types";

const CHOICES = [
  { key: "confirmed", label: "Yes, that's what I thought", tone: "emerald" },
  { key: "rejected", label: "That's not my confusion", tone: "rose" },
  { key: "unsure", label: "I'm still unsure", tone: "amber" },
] as const;

/** Stage 1 — the diagnosis itself, and the student's verdict on it. */
export function DiagnosisCard({
  diagnosis,
  onFeedback,
}: {
  diagnosis: Diagnosis;
  onFeedback: (value: Diagnosis["studentFeedback"]) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confidence = Math.round(diagnosis.confidence * 100);

  async function choose(value: Diagnosis["studentFeedback"]) {
    setBusy(value);
    setError(null);
    try {
      await onFeedback(value);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not record your answer.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="ConceptLens · misconception diagnosis"
        title={diagnosis.misconception}
        description={diagnosis.concept}
        action={<SourceTag source={diagnosis.generatedBy} />}
      />
      <CardBody className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">
            What you wrote
          </h3>
          <blockquote className="mt-1.5 text-[13.5px] leading-relaxed text-slate-700">
            &ldquo;{diagnosis.studentReasoning}&rdquo;
          </blockquote>
        </section>

        <section>
          <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">
            Why that reasoning fails
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate-800">
            {diagnosis.whyReasoningFails}
          </p>
        </section>

        <section className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3.5">
          <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-sky-800">
            Counterexample
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-800">
            {diagnosis.counterexample}
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          {diagnosis.missingPrerequisites.length > 0 ? (
            <section>
              <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                Missing prerequisites
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {diagnosis.missingPrerequisites.map((prereq) => (
                  <Badge key={prereq} tone="violet">
                    {prereq}
                  </Badge>
                ))}
              </div>
            </section>
          ) : (
            <div />
          )}

          <ConfidenceMeter value={confidence} />
        </div>

        <section className="rounded-xl border border-slate-200 px-4 py-3.5">
          <h3 className="text-[13px] font-medium text-slate-800">
            Is that actually what you were thinking?
          </h3>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Your answer refines the diagnosis. Rejecting it sends you back to
            describe the confusion yourself, rather than practising against the
            wrong premise.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHOICES.map((choice) => {
              const active = diagnosis.studentFeedback === choice.key;
              return (
                <Button
                  key={choice.key}
                  size="sm"
                  variant={active ? "primary" : "secondary"}
                  loading={busy === choice.key}
                  onClick={() => choose(choice.key)}
                  className={cn(active && "ring-2 ring-brand-500/25")}
                >
                  {choice.label}
                </Button>
              );
            })}
          </div>
          {error ? <ErrorState className="mt-3" message={error} /> : null}
        </section>
      </CardBody>
    </Card>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:w-44">
      <div className="text-[11px] font-medium uppercase tracking-[0.07em] text-slate-500">
        Diagnosis confidence
      </div>
      <div className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900">
        {value}%
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Diagnosis confidence"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            value >= 80
              ? "bg-emerald-500"
              : value >= 60
                ? "bg-amber-500"
                : "bg-slate-400",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
