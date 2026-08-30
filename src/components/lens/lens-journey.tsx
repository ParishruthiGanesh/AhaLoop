"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DiagnosisCard } from "./diagnosis-card";
import { ErrorTwinPractice } from "./error-twin";
import { ExplainMyWay } from "./explain-my-way";
import { PerspectiveLab } from "./perspective-lab";
import { RepairPath } from "./repair-path";
import { TeachBack } from "./teach-back";
import { MasteryPill } from "../mastery";
import { Badge, Card, CardBody, SuccessNote, cn } from "../ui";
import type { Diagnosis, MasteryState, TeachBackEvaluation } from "@/lib/types";

const STEPS = [
  { key: "diagnosis", label: "Diagnosis" },
  { key: "repair", label: "Prerequisite repair" },
  { key: "practice", label: "ErrorTwin practice" },
  { key: "explain", label: "Other explanations" },
  { key: "teachback", label: "Teach-back" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function LensJourney({
  diagnosis: initialDiagnosis,
  teachBackPrompt,
}: {
  diagnosis: Diagnosis;
  teachBackPrompt: string;
}) {
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);
  const [step, setStep] = useState<StepKey>("diagnosis");
  const [repaired, setRepaired] = useState<string[]>([]);
  const [practice, setPractice] = useState({ answered: 0, correct: 0, total: 0 });
  const [evaluation, setEvaluation] = useState<TeachBackEvaluation | null>(null);

  const masteryState: MasteryState =
    evaluation?.masteryState ?? diagnosis.masteryState;

  const completed = useMemo<Record<StepKey, boolean>>(
    () => ({
      diagnosis: diagnosis.studentFeedback !== null,
      repair:
        diagnosis.repairPath.length === 0 ||
        repaired.length >= diagnosis.repairPath.length,
      practice:
        practice.total > 0 && practice.answered >= practice.total,
      explain: step === "explain" || step === "teachback",
      teachback: evaluation?.resolved ?? false,
    }),
    [diagnosis, repaired, practice, evaluation, step],
  );

  async function submitFeedback(value: Diagnosis["studentFeedback"]) {
    const res = await fetch("/api/analysis/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ diagnosisId: diagnosis.id, feedback: value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not record your answer.");
    setDiagnosis(data.diagnosis);
    router.refresh();
    if (value === "confirmed") setStep("repair");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">ConceptLens</Badge>
            <MasteryPill state={masteryState} showMeaning />
          </div>
          <h1 className="mt-2 text-[21px] font-semibold leading-snug tracking-[-0.02em] text-slate-900">
            {diagnosis.concept}
          </h1>
        </div>
        <Link
          href="/student"
          className="text-[13px] font-medium text-slate-500 hover:text-slate-800"
        >
          ← My learning
        </Link>
      </header>

      <Stepper
        current={step}
        completed={completed}
        onSelect={setStep}
      />

      {evaluation?.resolved ? (
        <SuccessNote>
          <strong className="font-semibold">Cycle complete.</strong> Your
          teacher&rsquo;s dashboard now shows this concept as resolved for you —
          not because you finished the activities, but because your own
          explanation no longer contains the misconception.
        </SuccessNote>
      ) : null}

      {diagnosis.studentFeedback === "rejected" ? (
        <Card>
          <CardBody className="space-y-2">
            <h2 className="text-[15px] font-semibold text-slate-900">
              Fair enough — that wasn&rsquo;t your confusion
            </h2>
            <p className="text-[13.5px] leading-relaxed text-slate-600">
              Practising against the wrong premise is worse than not practising
              at all. Describe what you actually think in your own words and
              ConceptLens will diagnose that instead.
            </p>
            <Link
              href="/student"
              className="inline-block text-[13px] font-medium text-brand-600 hover:underline"
            >
              Start a new diagnosis →
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <div className="animate-fade">
        {step === "diagnosis" ? (
          <DiagnosisCard diagnosis={diagnosis} onFeedback={submitFeedback} />
        ) : null}

        {step === "repair" ? (
          <RepairPath
            nodes={diagnosis.repairPath}
            completed={repaired}
            onComplete={(id) =>
              setRepaired((prev) => (prev.includes(id) ? prev : [...prev, id]))
            }
          />
        ) : null}

        {step === "practice" ? (
          <ErrorTwinPractice
            diagnosisId={diagnosis.id}
            errorTwin={diagnosis.errorTwin}
            onProgress={(summary) => {
              setPractice(summary);
              router.refresh();
            }}
          />
        ) : null}

        {step === "explain" ? (
          <div className="space-y-5">
            <ExplainMyWay
              concept={diagnosis.concept}
              misconception={diagnosis.misconception}
            />
            <PerspectiveLab
              concept={diagnosis.concept}
              misconception={diagnosis.misconception}
            />
          </div>
        ) : null}

        {step === "teachback" ? (
          <TeachBack
            diagnosisId={diagnosis.id}
            prompt={teachBackPrompt}
            onResolved={(result) => {
              setEvaluation(result);
              router.refresh();
            }}
          />
        ) : null}
      </div>

      <StepNav current={step} onSelect={setStep} />
    </div>
  );
}

function Stepper({
  current,
  completed,
  onSelect,
}: {
  current: StepKey;
  completed: Record<StepKey, boolean>;
  onSelect: (step: StepKey) => void;
}) {
  return (
    <nav aria-label="ConceptLens stages">
      <ol className="flex flex-wrap gap-1.5">
        {STEPS.map((item, index) => {
          const isCurrent = item.key === current;
          const isDone = completed[item.key];
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onSelect(item.key)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[12.5px] font-medium transition-colors",
                  isCurrent
                    ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500/20"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[10.5px] font-semibold",
                    isCurrent
                      ? "bg-brand-600 text-white"
                      : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-600",
                  )}
                >
                  {isDone && !isCurrent ? "✓" : index + 1}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepNav({
  current,
  onSelect,
}: {
  current: StepKey;
  onSelect: (step: StepKey) => void;
}) {
  const index = STEPS.findIndex((s) => s.key === current);
  const previous = STEPS[index - 1];
  const next = STEPS[index + 1];

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
      {previous ? (
        <button
          type="button"
          onClick={() => onSelect(previous.key)}
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          ← {previous.label}
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button
          type="button"
          onClick={() => onSelect(next.key)}
          className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-700"
        >
          {next.label} →
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
