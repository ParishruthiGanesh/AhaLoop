"use client";

import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  SuccessNote,
  cn,
} from "../ui";
import type { ErrorTwin as ErrorTwinModel } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  similar: "Similar case",
  "new-context": "New context",
  boundary: "Boundary case",
  explain: "Explain it",
  transfer: "Transfer to another domain",
};

interface Result {
  isCorrect: boolean;
  correctOptionId: string;
  trapExplanation: string;
  selectedOptionId: string;
}

/**
 * Stage 3 — ErrorTwin.
 * Practice built around the reasoning pattern rather than the original
 * question, so getting these right is evidence the habit changed.
 */
export function ErrorTwinPractice({
  diagnosisId,
  errorTwin,
  onProgress,
}: {
  diagnosisId: string;
  errorTwin: ErrorTwinModel;
  onProgress: (summary: { answered: number; correct: number; total: number }) => void;
}) {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [pending, setPending] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = errorTwin.questions.length;
  const answered = Object.keys(results).length;
  const correct = Object.values(results).filter((r) => r.isCorrect).length;

  async function submit(questionId: string) {
    const selectedOptionId = pending[questionId];
    if (!selectedOptionId) return;
    setBusy(questionId);
    setError(null);
    try {
      const res = await fetch("/api/analysis/practice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ diagnosisId, questionId, selectedOptionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not check your answer.");

      const next = {
        ...results,
        [questionId]: {
          isCorrect: data.isCorrect,
          correctOptionId: data.correctOptionId,
          trapExplanation: data.trapExplanation,
          selectedOptionId,
        },
      };
      setResults(next);
      onProgress({
        answered: Object.keys(next).length,
        correct: Object.values(next).filter((r) => r.isCorrect).length,
        total,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not check your answer.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="ErrorTwin"
        title="Practice against your own reasoning pattern"
        description={errorTwin.description}
        action={
          <Badge tone={answered === total ? (correct === total ? "green" : "amber") : "neutral"}>
            {answered}/{total} answered
          </Badge>
        }
      />
      <CardBody className="space-y-4">
        <section className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-violet-800">
            Your ErrorTwin
          </h3>
          <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-slate-800">
            {errorTwin.pattern}
          </p>
        </section>

        {error ? <ErrorState message={error} /> : null}

        <ol className="space-y-3">
          {errorTwin.questions.map((question, index) => {
            const result = results[question.id];
            const locked = Boolean(result);

            return (
              <li
                key={question.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                    {index + 1}
                  </span>
                  <Badge tone="sky">
                    {KIND_LABEL[question.kind] ?? question.kind}
                  </Badge>
                  {result ? (
                    <Badge tone={result.isCorrect ? "green" : "rose"}>
                      {result.isCorrect ? "Correct" : "Not quite"}
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-2.5 text-[14px] leading-relaxed text-slate-900">
                  {question.prompt}
                </p>

                <fieldset className="mt-3 space-y-2" disabled={locked}>
                  <legend className="sr-only">Choose an answer</legend>
                  {question.options.map((option) => {
                    const chosen = locked
                      ? result.selectedOptionId === option.id
                      : pending[question.id] === option.id;
                    const isRight =
                      locked && option.id === result.correctOptionId;
                    const isWrongChoice =
                      locked && chosen && !result.isCorrect;

                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 transition-colors",
                          isRight
                            ? "border-emerald-300 bg-emerald-50"
                            : isWrongChoice
                              ? "border-rose-300 bg-rose-50"
                              : chosen
                                ? "border-brand-400 bg-brand-50/60"
                                : "border-slate-200 hover:border-slate-300",
                          locked && "cursor-default",
                        )}
                      >
                        <input
                          type="radio"
                          name={`et-${question.id}`}
                          value={option.id}
                          checked={chosen}
                          onChange={() =>
                            setPending((prev) => ({
                              ...prev,
                              [question.id]: option.id,
                            }))
                          }
                          className="mt-0.5 size-4 accent-brand-600"
                        />
                        <span className="text-[13.5px] leading-relaxed text-slate-800">
                          {option.text}
                        </span>
                      </label>
                    );
                  })}
                </fieldset>

                {locked ? (
                  <div
                    className={cn(
                      "mt-3 rounded-lg px-3.5 py-3 text-[13px] leading-relaxed",
                      result.isCorrect
                        ? "bg-emerald-50 text-emerald-900"
                        : "bg-rose-50 text-rose-900",
                    )}
                  >
                    <strong className="font-semibold">
                      {result.isCorrect
                        ? "Why that's right: "
                        : "Where that reasoning goes wrong: "}
                    </strong>
                    {question.trapExplanation}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className="mt-3"
                    loading={busy === question.id}
                    disabled={!pending[question.id]}
                    onClick={() => submit(question.id)}
                  >
                    Check answer
                  </Button>
                )}
              </li>
            );
          })}
        </ol>

        {answered === total ? (
          correct === total ? (
            <SuccessNote>
              All {total} correct — including the transfer question in a domain
              you hadn&rsquo;t seen. That is evidence the pattern changed, not
              that one answer was memorised.
            </SuccessNote>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
              {correct} of {total} correct. The pattern is still showing up.
              Re-read the counterexample in your diagnosis, or try a different
              explanation style below before the teach-back.
            </div>
          )
        ) : null}
      </CardBody>
    </Card>
  );
}
