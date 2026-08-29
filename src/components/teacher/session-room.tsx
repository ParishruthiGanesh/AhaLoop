"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { ConfusionMapPanel } from "./confusion-map-panel";
import { JoinCodePanel } from "./join-code-panel";
import { MasteryBoard } from "./mastery-board";
import { QuestionComposer } from "./question-composer";
import { ResponseFeed } from "./response-feed";
import {
  Badge,
  Button,
  Card,
  CardBody,
  ErrorState,
  LoadingBlock,
  Stat,
  cn,
} from "../ui";
import { useLiveSession } from "@/hooks/use-live-session";
import { SEED_STUDENTS } from "@/lib/lesson";
import type { LiveSnapshot, Question, SessionStatus } from "@/lib/types";

const SEED_NAMES = new Set(SEED_STUDENTS.map((s) => s.name));

export function SessionRoom({ initial }: { initial: LiveSnapshot }) {
  const { snapshot, status, error, refresh } = useLiveSession(
    initial.session.id,
    initial,
  );

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initial.questions.at(-1)?.id ?? null,
  );
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(
    initial.questions.length === 0,
  );

  const live = snapshot ?? initial;

  const activeQuestion: Question | null = useMemo(() => {
    if (live.questions.length === 0) return null;
    return (
      live.questions.find((q) => q.id === selectedQuestionId) ??
      live.questions.at(-1) ??
      null
    );
  }, [live.questions, selectedQuestionId]);

  const responses = useMemo(
    () =>
      activeQuestion
        ? live.responses.filter((r) => r.questionId === activeQuestion.id)
        : [],
    [live.responses, activeQuestion],
  );

  const confusionMap = useMemo(
    () =>
      activeQuestion
        ? (live.confusionMaps.find((m) => m.questionId === activeQuestion.id) ??
          null)
        : null,
    [live.confusionMaps, activeQuestion],
  );

  // The seeded walkthrough uses fabricated students; say so wherever they show.
  const showsDemoData = live.participants.some((p) =>
    SEED_NAMES.has(p.displayName),
  );

  const analyse = useCallback(async () => {
    if (!activeQuestion) return;
    setAnalysing(true);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/analysis/confusion-map", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: activeQuestion.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not analyse responses.");
      await refresh();
    } catch (caught) {
      setAnalysisError(
        caught instanceof Error
          ? caught.message
          : "Could not analyse responses.",
      );
    } finally {
      setAnalysing(false);
    }
  }, [activeQuestion, refresh]);

  const changeStatus = useCallback(
    async (next: SessionStatus) => {
      await fetch(`/api/sessions/${live.session.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      await refresh();
    },
    [live.session.id, refresh],
  );

  const publishQuestion = useCallback(
    async (questionId: string, next: "published" | "closed") => {
      await fetch(`/api/questions/${questionId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      await refresh();
    },
    [refresh],
  );

  if (status === "loading" && !snapshot) {
    return <LoadingBlock label="Opening the classroom…" />;
  }

  const resolvedCount = live.mastery.filter(
    (m) => m.stage === "resolved" || m.state === "blue",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              {live.session.title}
            </h1>
            {showsDemoData ? <Badge tone="amber">Demo data</Badge> : null}
          </div>
          <p className="mt-0.5 text-[13.5px] text-slate-500">
            {live.session.topic}
          </p>
        </div>
        <Link
          href="/teacher"
          className="text-[13px] font-medium text-slate-500 hover:text-slate-800"
        >
          ← All classrooms
        </Link>
      </div>

      {error ? <ErrorState message={error} onRetry={refresh} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students joined" value={live.participants.length} />
        <Stat
          label="Responses"
          value={responses.length}
          tone="brand"
          hint={activeQuestion ? "on the selected question" : undefined}
        />
        <Stat
          label="Confusion groups"
          value={confusionMap ? confusionMap.groups.length : "—"}
          tone="amber"
          hint={confusionMap ? undefined : "run the analysis"}
        />
        <Stat
          label="Resolved"
          value={`${resolvedCount}/${live.mastery.length || 0}`}
          tone="green"
          hint="misconception verified gone"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <JoinCodePanel
            session={live.session}
            participantCount={live.participants.length}
            onStatusChange={changeStatus}
          />

          {live.questions.length > 0 ? (
            <Card>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                    Questions
                  </h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setComposerOpen((open) => !open)}
                  >
                    {composerOpen ? "Hide composer" : "New question"}
                  </Button>
                </div>

                <ul className="space-y-2">
                  {live.questions.map((question) => {
                    const isActive = question.id === activeQuestion?.id;
                    const count = live.responses.filter(
                      (r) => r.questionId === question.id,
                    ).length;
                    return (
                      <li key={question.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedQuestionId(question.id)}
                          aria-pressed={isActive}
                          className={cn(
                            "w-full rounded-xl border px-3.5 py-3 text-left transition-colors",
                            isActive
                              ? "border-brand-400 bg-brand-50/70 ring-1 ring-brand-500/20"
                              : "border-slate-200 bg-white hover:border-slate-300",
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={
                                question.status === "published"
                                  ? "green"
                                  : question.status === "closed"
                                    ? "neutral"
                                    : "amber"
                              }
                            >
                              {question.status}
                            </Badge>
                            <span className="text-[12px] text-slate-500">
                              {count} {count === 1 ? "response" : "responses"}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-slate-800">
                            {question.prompt}
                          </p>
                        </button>

                        {isActive ? (
                          <div className="mt-2 flex gap-2 pl-1">
                            {question.status !== "published" ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  publishQuestion(question.id, "published")
                                }
                              >
                                Publish
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  publishQuestion(question.id, "closed")
                                }
                              >
                                Close responses
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {composerOpen ? (
            <QuestionComposer
              sessionId={live.session.id}
              defaultConcept={live.session.topic}
              onCreated={async () => {
                setComposerOpen(false);
                await refresh();
              }}
            />
          ) : null}

          <ResponseFeed
            question={activeQuestion}
            responses={responses}
            participants={live.participants}
            isDemoData={showsDemoData}
          />

          <MasteryBoard mastery={live.mastery} />
        </div>

        <div className="space-y-5">
          <ConfusionMapPanel
            map={confusionMap}
            participants={live.participants}
            loading={analysing}
            error={analysisError}
            canAnalyse={Boolean(activeQuestion) && responses.length > 0}
            responseCount={responses.length}
            onAnalyse={analyse}
          />
        </div>
      </div>
    </div>
  );
}
