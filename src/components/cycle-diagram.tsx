import { cn } from "./ui";

const STEPS = [
  {
    key: "pulse",
    title: "LecturePulse",
    caption: "How the class is confused",
    detail:
      "Every written answer is grouped by the kind of reasoning behind it, not by which option was ticked.",
  },
  {
    key: "lens",
    title: "ConceptLens",
    caption: "Why this student is confused",
    detail:
      "The specific belief that produced the answer, with the counterexample that breaks it.",
  },
  {
    key: "prereq",
    title: "Prerequisite repair",
    caption: "What is actually missing",
    detail:
      "The shortest path back through the concept graph — five minutes, not a whole chapter.",
  },
  {
    key: "twin",
    title: "ErrorTwin",
    caption: "Does the error repeat?",
    detail:
      "Practice built around the reasoning pattern, in contexts the student has never seen.",
  },
  {
    key: "teach",
    title: "Teach-back",
    caption: "Has it actually gone?",
    detail:
      "The loop closes only when the student can explain it — not when a video finishes.",
  },
];

/** The learning cycle, rendered as the spine of the product story. */
export function CycleDiagram({ className }: { className?: string }) {
  return (
    <ol className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-5", className)}>
      {STEPS.map((step, index) => (
        <li
          key={step.key}
          className="relative flex flex-col rounded-xl border border-slate-200 bg-white/80 p-4"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
              {index + 1}
            </span>
            <span className="text-[13.5px] font-semibold text-slate-900">
              {step.title}
            </span>
          </div>
          <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.06em] text-brand-600">
            {step.caption}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">
            {step.detail}
          </p>
          {index < STEPS.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-slate-300 lg:block"
            >
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
