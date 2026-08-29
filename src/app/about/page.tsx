import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand";
import { CycleDiagram } from "@/components/cycle-diagram";
import { Badge, Card, CardBody } from "@/components/ui";
import { getModeInfo } from "@/lib/config";

export const metadata: Metadata = { title: "How it works" };

const SECTIONS = [
  {
    title: "1 · LecturePulse — how the class is confused",
    body: "The teacher asks one question and, crucially, asks for the reasoning as well as the answer. The analysis groups students by the kind of reasoning behind their answer — two students who picked different options for the same underlying reason land in the same group. The teacher gets the dominant misconception, the prerequisite gaps ranked by how many students need them, a two-minute intervention, a counterexample and a follow-up question that would separate the groups.",
  },
  {
    title: "2 · ConceptLens — why this student is confused",
    body: "A student opens their own answer, or types what they think without knowing what the confusion is. The diagnosis names the specific belief, shows why it fails against concrete numbers, gives a counterexample and states its own confidence. The student can reject the diagnosis — rejecting it stops the cycle rather than practising against the wrong premise.",
  },
  {
    title: "3 · Prerequisite Detective — what's actually missing",
    body: "Concepts form a graph. Rather than sending the student back through a chapter, the system walks backwards from the misconception to the two or three concepts underneath it and orders them deepest-first. Each node is a one-minute explanation, a worked example and a single check question.",
  },
  {
    title: "4 · ErrorTwin — does the error repeat?",
    body: "Practice is built around the reasoning pattern, not the original question: a near-identical case, the same trap moved to a new domain, then a transfer question somewhere unrelated. Every item carries a distractor built from the student's own misconception, so a relapse is distinguishable from a random miss.",
  },
  {
    title: "5 · Explain My Way and PerspectiveLab",
    body: "The same concept in simple language, technical form, step-by-step, low-text visual, or as a sustained analogy — and in another language, optionally keeping technical terms in English. PerspectiveLab adds the voices of people whose work depends on the idea: a physician, a security analyst, an examiner, a data scientist, and a plain everyday analogy.",
  },
  {
    title: "6 · Teach-back — has it actually gone?",
    body: "The cycle closes only here. The student explains the concept in their own words, and the evaluation asks whether the original misconception is still driving the explanation, whether the phrasing is merely recalled, and whether the idea transfers beyond the first example. Mastery moves red → yellow → green → blue on that evidence, and the teacher's dashboard updates.",
  },
];

export default function AboutPage() {
  const mode = getModeInfo();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-md">
          <Logo />
        </Link>
        <Link
          href="/demo"
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900"
        >
          Open the demo
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6">
        <section className="animate-rise pt-6">
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[36px]">
            How ThinkTrace works
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            The innovation is not that it contains a tutor, a quiz generator and
            a polling tool. It is that classroom-level confusion and
            individual-level diagnosis are the same loop, and the loop does not
            close until the misconception is demonstrably gone.
          </p>
        </section>

        <CycleDiagram className="mt-8" />

        <section className="mt-10 space-y-4">
          {SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardBody>
                <h2 className="text-[15.5px] font-semibold tracking-[-0.01em] text-slate-900">
                  {section.title}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                  {section.body}
                </p>
              </CardBody>
            </Card>
          ))}
        </section>

        <section className="mt-10">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15.5px] font-semibold text-slate-900">
                  What this build is running on
                </h2>
                <Badge tone={mode.supabase ? "green" : "amber"}>
                  {mode.supabase ? "Supabase" : "In-memory store"}
                </Badge>
                <Badge tone={mode.llm ? "green" : "amber"}>
                  {mode.llm ? `${mode.llmProvider} model` : "Demo analyzer"}
                </Badge>
              </div>
              <p className="text-[14px] leading-relaxed text-slate-600">
                ThinkTrace runs with or without external services. With Supabase
                configured, accounts, classrooms and responses persist and
                stream over Realtime; with a model key configured, every piece
                of analysis is generated live and validated against a strict
                schema before it reaches the screen.
              </p>
              <p className="text-[14px] leading-relaxed text-slate-600">
                Without them, the application is still complete: an in-memory
                store backs the same interface, and a deterministic analyzer
                reads each student&rsquo;s actual words against a misconception
                catalogue for the sample lesson. Every screen states which of
                the two produced what you are reading.
              </p>
            </CardBody>
          </Card>
        </section>
      </main>
    </div>
  );
}
