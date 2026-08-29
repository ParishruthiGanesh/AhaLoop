"use client";

import { SourceTag } from "../mastery";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingBlock,
  cn,
} from "../ui";
import type { ConfusionMap, Participant } from "@/lib/types";

/**
 * LecturePulse. The point of this panel is that it is not a bar chart of
 * option counts — every row is a *kind of reasoning*, with the AI's reading of
 * it and the teacher's next move underneath.
 */
export function ConfusionMapPanel({
  map,
  participants,
  loading,
  error,
  canAnalyse,
  responseCount,
  onAnalyse,
}: {
  map: ConfusionMap | null;
  participants: Participant[];
  loading: boolean;
  error: string | null;
  canAnalyse: boolean;
  responseCount: number;
  onAnalyse: () => void;
}) {
  const nameOf = (id: string) =>
    participants.find((p) => p.id === id)?.displayName ?? "Student";

  return (
    <Card>
      <CardHeader
        eyebrow="LecturePulse"
        title="Confusion map"
        description="Students grouped by the reasoning behind their answer, not by the option they chose."
        action={
          <Button
            size="sm"
            loading={loading}
            disabled={!canAnalyse}
            onClick={onAnalyse}
          >
            {map ? "Re-analyse" : "Analyse responses"}
          </Button>
        }
      />
      <CardBody className="space-y-5">
        {error ? <ErrorState message={error} onRetry={onAnalyse} /> : null}

        {loading && !map ? (
          <LoadingBlock label="Reading every student's reasoning…" />
        ) : null}

        {!loading && !map && !error ? (
          <EmptyState
            icon="🧭"
            title={
              responseCount === 0
                ? "No responses yet"
                : `${responseCount} ${responseCount === 1 ? "response" : "responses"} in — ready to analyse`
            }
            description={
              responseCount === 0
                ? "Publish a question and the responses will appear here as students submit them."
                : "Run the analysis to group the class by how it is confused and get an intervention you can deliver right now."
            }
            action={
              canAnalyse ? (
                <Button size="sm" onClick={onAnalyse}>
                  Analyse responses
                </Button>
              ) : null
            }
          />
        ) : null}

        {map ? (
          <div className="animate-fade space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <SourceTag source={map.generatedBy} />
              <span className="text-[12px] text-slate-500">
                {map.totalResponses}{" "}
                {map.totalResponses === 1 ? "response" : "responses"} analysed
              </span>
            </div>

            {/* Confusion groups */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase tracking-[0.06em] text-slate-500">
                    <th className="px-4 py-2.5 font-semibold">Confusion type</th>
                    <th className="w-20 px-4 py-2.5 text-right font-semibold">
                      Students
                    </th>
                    <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">
                      What they appear to think
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {map.groups.map((group) => (
                    <tr
                      key={group.label}
                      className="border-t border-slate-200 align-top"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              group.isCorrectGroup
                                ? "bg-emerald-500"
                                : "bg-rose-500",
                            )}
                          />
                          <span className="text-[13.5px] font-medium text-slate-900">
                            {group.label}
                          </span>
                        </div>
                        {group.participantIds.length > 0 ? (
                          <p className="mt-1 pl-4 text-[11.5px] text-slate-500">
                            {group.participantIds.map(nameOf).join(", ")}
                          </p>
                        ) : null}
                        <p className="mt-1.5 pl-4 text-[12.5px] leading-relaxed text-slate-600 sm:hidden">
                          {group.interpretation}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[15px] font-semibold tabular-nums text-slate-900">
                          {group.studentCount}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-[12.5px] leading-relaxed text-slate-600 sm:table-cell">
                        {group.interpretation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Prerequisite gaps */}
            {map.missingPrerequisites.length > 0 ? (
              <section>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                  Missing prerequisites across the class
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {map.missingPrerequisites.map((prereq) => (
                    <Badge key={prereq} tone="violet">
                      {prereq}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-2">
              <Insight
                label="Most common misconception"
                tone="rose"
                body={map.topMisconception}
              />
              <Insight
                label="Counterexample to put on the board"
                tone="sky"
                body={map.counterexample}
              />
            </div>

            <Insight
              label="Recommended two-minute intervention"
              tone="brand"
              body={map.recommendedIntervention}
            />

            <Insight
              label="Suggested follow-up question"
              tone="amber"
              body={map.suggestedFollowUpQuestion}
            />

            {map.studentsNeedingHelp.length > 0 ? (
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                  May need one-to-one help
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[...new Set(map.studentsNeedingHelp)].map((id) => (
                    <Badge key={id}>{nameOf(id)}</Badge>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

const TONES = {
  rose: "border-rose-200 bg-rose-50/70",
  sky: "border-sky-200 bg-sky-50/70",
  brand: "border-brand-200 bg-brand-50/70",
  amber: "border-amber-200 bg-amber-50/70",
} as const;

function Insight({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: keyof typeof TONES;
}) {
  return (
    <section className={cn("rounded-xl border px-4 py-3.5", TONES[tone])}>
      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-slate-600">
        {label}
      </h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-800">
        {body}
      </p>
    </section>
  );
}
