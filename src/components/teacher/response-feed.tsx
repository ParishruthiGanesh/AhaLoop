"use client";

import { Badge, Card, CardBody, CardHeader, EmptyState, cn } from "../ui";
import type { Participant, Question, Response } from "@/lib/types";

/** The live stream of answers, with the reasoning shown in full. */
export function ResponseFeed({
  question,
  responses,
  participants,
  isDemoData,
}: {
  question: Question | null;
  responses: Response[];
  participants: Participant[];
  isDemoData: boolean;
}) {
  const nameOf = (id: string) =>
    participants.find((p) => p.id === id)?.displayName ?? "Student";

  const optionText = (id: string | null) =>
    question?.options.find((o) => o.id === id)?.text ?? null;

  return (
    <Card>
      <CardHeader
        eyebrow="Live responses"
        title={
          <span className="flex items-center gap-2">
            {responses.length} in
            {responses.length > 0 ? (
              <span className="flex items-center gap-1.5 text-[12px] font-normal text-emerald-600">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                live
              </span>
            ) : null}
          </span>
        }
        description={
          question?.allowAnonymous
            ? "Responses are anonymous — names are hidden everywhere."
            : "Each student's written reasoning is what the analysis reads."
        }
      />
      <CardBody>
        {responses.length === 0 ? (
          <EmptyState
            icon="⏳"
            title="Waiting for answers"
            description={
              question
                ? "Students who have joined can see this question now."
                : "Publish a question to open the floor."
            }
          />
        ) : (
          <ul className="scroll-slim max-h-[28rem] space-y-2.5 overflow-y-auto pr-1">
            {responses.map((response) => {
              const correct = response.isCorrect;
              return (
                <li
                  key={response.id}
                  className={cn(
                    "animate-fade rounded-xl border px-4 py-3",
                    correct === true
                      ? "border-emerald-200 bg-emerald-50/50"
                      : correct === false
                        ? "border-rose-200 bg-rose-50/40"
                        : "border-slate-200 bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium text-slate-900">
                      {question?.allowAnonymous
                        ? "Anonymous"
                        : nameOf(response.participantId)}
                    </span>
                    {correct === true ? (
                      <Badge tone="green">Correct</Badge>
                    ) : correct === false ? (
                      <Badge tone="rose">Incorrect</Badge>
                    ) : (
                      <Badge>Open response</Badge>
                    )}
                    {isDemoData ? <Badge tone="amber">Demo data</Badge> : null}
                  </div>

                  {optionText(response.selectedOptionId) ? (
                    <p className="mt-1.5 text-[13px] text-slate-700">
                      <span className="font-medium uppercase text-slate-400">
                        {response.selectedOptionId}
                      </span>{" "}
                      · {optionText(response.selectedOptionId)}
                    </p>
                  ) : null}

                  <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-[13px] leading-relaxed text-slate-600">
                    {response.reasoning}
                  </blockquote>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
