"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  SuccessNote,
  Textarea,
  cn,
} from "../ui";
import { useLiveSession } from "@/hooks/use-live-session";
import { activeQuestion } from "@/lib/live";
import type { LiveSnapshot } from "@/lib/types";

export function AnswerPanel({
  initial,
  participantId,
  existingDiagnosisId,
}: {
  initial: LiveSnapshot;
  participantId: string;
  existingDiagnosisId: string | null;
}) {
  const router = useRouter();
  const { snapshot, error, refresh } = useLiveSession(
    initial.session.id,
    initial,
  );
  const live = snapshot ?? initial;

  const [selected, setSelected] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const question = useMemo(
    () => activeQuestion(live.questions),
    [live.questions],
  );

  const myResponse = useMemo(
    () =>
      question
        ? (live.responses.find(
            (r) =>
              r.questionId === question.id && r.participantId === participantId,
          ) ?? null)
        : null,
    [live.responses, question, participantId],
  );

  const submit = useCallback(async () => {
    if (!question) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          selectedOptionId: selected,
          answerText: question.type === "open" ? reasoning : null,
          reasoning,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit your answer.");
      await refresh();
      router.refresh();
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not submit your answer.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [question, selected, reasoning, refresh, router]);

  const openLens = useCallback(async () => {
    if (!myResponse) return;
    setDiagnosing(true);
    setFormError(null);
    try {
      const res = await fetch("/api/analysis/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ responseId: myResponse.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not run the diagnosis.");
      router.push(`/student/lens/${data.diagnosis.id}`);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "Could not run the diagnosis.",
      );
      setDiagnosing(false);
    }
  }, [myResponse, router]);

  if (!question) {
    return (
      <Card>
        <CardHeader
          eyebrow={live.session.topic}
          title={live.session.title}
          description="You're in the classroom. Questions appear here the moment your teacher publishes them."
        />
        <CardBody>
          <EmptyState
            icon="👀"
            title="No question open right now"
            description="This page updates on its own — leave it open."
          />
        </CardBody>
      </Card>
    );
  }

  const answered = Boolean(myResponse);
  const chosenText = question.options.find(
    (o) => o.id === myResponse?.selectedOptionId,
  )?.text;

  return (
    <div className="space-y-5">
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}

      <Card>
        <CardHeader
          eyebrow={live.session.title}
          title={question.prompt}
          description={
            question.allowAnonymous
              ? "This question is anonymous — your name is not shown to your teacher."
              : undefined
          }
          action={
            answered ? <Badge tone="green">Submitted</Badge> : <Badge tone="amber">Open</Badge>
          }
        />
        <CardBody className="space-y-5">
          {question.type === "mcq" ? (
            <fieldset className="space-y-2" disabled={answered}>
              <legend className="sr-only">Choose an answer</legend>
              {question.options.map((option) => {
                const isChosen = answered
                  ? myResponse?.selectedOptionId === option.id
                  : selected === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                      isChosen
                        ? "border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300",
                      answered && "cursor-default",
                    )}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={option.id}
                      checked={isChosen}
                      onChange={() => setSelected(option.id)}
                      className="mt-0.5 size-4 accent-brand-600"
                    />
                    <span className="text-[13.5px] leading-relaxed text-slate-800">
                      <span className="mr-1.5 font-semibold uppercase text-slate-400">
                        {option.id}
                      </span>
                      {option.text}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}

          {answered ? (
            <div className="space-y-3">
              <SuccessNote>
                Your answer is in
                {chosenText ? (
                  <>
                    {" "}
                    — you chose{" "}
                    <strong className="font-semibold">{chosenText}</strong>
                  </>
                ) : null}
                .
              </SuccessNote>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                  What you wrote
                </p>
                <blockquote className="mt-1.5 text-[13.5px] leading-relaxed text-slate-700">
                  {myResponse?.reasoning}
                </blockquote>
              </div>

              {formError ? <ErrorState message={formError} /> : null}

              {existingDiagnosisId ? (
                <Link href={`/student/lens/${existingDiagnosisId}`}>
                  <Button className="w-full" size="lg">
                    Open your ConceptLens report
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  loading={diagnosing}
                  onClick={openLens}
                >
                  {diagnosing
                    ? "Reading your reasoning…"
                    : "Why was this wrong? Open ConceptLens"}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="reasoning"
                  className="block text-[13px] font-medium text-slate-700"
                >
                  Why did you answer that?
                </label>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  This is the part that gets diagnosed. Two sentences is plenty
                  — write what you were actually thinking.
                </p>
                <Textarea
                  id="reasoning"
                  rows={4}
                  className="mt-2"
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="I thought…"
                  maxLength={4000}
                />
              </div>

              {formError ? <ErrorState message={formError} /> : null}

              <Button
                size="lg"
                className="w-full"
                loading={submitting}
                disabled={
                  reasoning.trim().length < 3 ||
                  (question.type === "mcq" && !selected)
                }
                onClick={submit}
              >
                {submitting ? "Submitting…" : "Submit answer"}
              </Button>
            </>
          )}
        </CardBody>
      </Card>

      {!answered && submitting ? (
        <LoadingBlock label="Sending to your teacher's dashboard…" />
      ) : null}
    </div>
  );
}
