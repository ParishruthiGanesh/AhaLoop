import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand";
import { CycleDiagram } from "@/components/cycle-diagram";
import { DemoLauncher } from "@/components/demo-launcher";
import { Badge, Card, CardBody } from "@/components/ui";
import { getModeInfo } from "@/lib/config";

export const metadata: Metadata = { title: "Demo" };

const SCRIPT = [
  "The teacher opens a live classroom and reads out the join code.",
  "Five students answer one question and, crucially, say why.",
  "LecturePulse groups the room by reasoning and recommends an intervention.",
  "A student opens their own incorrect answer in ConceptLens.",
  "Prerequisite Detective finds the missing concept underneath it.",
  "ErrorTwin generates practice around that reasoning pattern.",
  "The student re-reads it in another style or language.",
  "Teach-back decides whether the misconception is really gone.",
  "The teacher dashboard updates to show it resolved.",
];

export default function DemoPage() {
  const mode = getModeInfo();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-md">
          <Logo />
        </Link>
        <Link
          href="/login"
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900"
        >
          Sign in instead
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
        <section className="animate-rise pt-6">
          <Badge tone={mode.llm ? "green" : "amber"}>
            {mode.llm
              ? `Live analysis via ${mode.llmProvider}`
              : "Demo analyzer — no LLM key configured"}
          </Badge>
          <h1 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[36px]">
            The two-minute walkthrough
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            The sample lesson is accuracy, precision, recall and class
            imbalance. Pick a side of the classroom to enter — the seeded
            responses and the analysis are the same either way.
          </p>
        </section>

        <section className="mt-8">
          <DemoLauncher supabaseEnabled={mode.supabase} />
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardBody>
              <h2 className="text-[15px] font-semibold text-slate-900">
                What the walkthrough shows
              </h2>
              <ol className="mt-3 space-y-2">
                {SCRIPT.map((line, index) => (
                  <li key={line} className="flex gap-3 text-[13.5px] leading-relaxed text-slate-600">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {index + 1}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="text-[15px] font-semibold text-slate-900">
                About the data you&rsquo;ll see
              </h2>
              <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-slate-600">
                <p>
                  The five students, their answers and their written reasoning
                  are <strong className="font-semibold text-slate-800">demonstration data</strong>,
                  written to span genuinely different misconceptions. Every
                  screen that shows them says so.
                </p>
                <p>
                  {mode.llm
                    ? "Analysis on this deployment comes from a live model, so results will vary slightly between runs."
                    : "With no LLM key configured, analysis comes from the built-in demo analyzer. It reads the students' actual words and classifies them — it is not a fixed script — but it only knows this lesson's misconception catalogue."}
                </p>
                <p>
                  {mode.supabase
                    ? "Data is persisted to Supabase, and responses stream in over Realtime."
                    : "Data lives in the server's memory and resets when the server restarts."}
                </p>
              </div>
            </CardBody>
          </Card>
        </section>

        <section className="mt-10">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            The cycle you&rsquo;re about to walk
          </h2>
          <CycleDiagram className="mt-4" />
        </section>
      </main>
    </div>
  );
}
