import Link from "next/link";
import { redirect } from "next/navigation";

import { CycleDiagram } from "@/components/cycle-diagram";
import { Logo } from "@/components/brand";
import { Badge, Button, Card, CardBody } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getModeInfo } from "@/lib/config";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "teacher" ? "/teacher" : "/student");

  const mode = getModeInfo();
  const connected = mode.supabase && mode.llm;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            href="/about"
            className="hidden rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900 sm:block"
          >
            How it works
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <section className="animate-rise pt-10 sm:pt-16">
          <Badge tone={connected ? "green" : "amber"}>
            {connected
              ? "Connected — Supabase and live model configured"
              : "Runs fully in demo mode — no API keys required"}
          </Badge>

          <h1 className="mt-5 max-w-3xl text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900 sm:text-[46px]">
            Don&rsquo;t just mark the wrong answer.
            <span className="block bg-gradient-to-r from-brand-600 to-sky-600 bg-clip-text text-transparent">
              Understand the thinking behind it.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-slate-600">
            ThinkTrace AI shows a teacher how their whole class is confused,
            diagnoses why each individual student is confused, and keeps
            teaching until the misconception is demonstrably gone.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/demo">
              <Button size="lg">Open the seeded demo</Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                Create an account
              </Button>
            </Link>
          </div>

          <p className="mt-3 text-[12.5px] text-slate-500">
            The demo opens a live classroom on the sample lesson — accuracy,
            precision, recall and class imbalance.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            One connected cycle
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-slate-600">
            Most tools measure whether an answer was submitted and whether it
            was right. ThinkTrace measures why it was wrong, which prerequisite
            caused it, whether the same reasoning error shows up elsewhere, and
            whether it has actually disappeared.
          </p>
          <CycleDiagram className="mt-6" />
        </section>

        <section className="mt-14 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody>
              <Badge tone="brand">Teacher</Badge>
              <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">
                A confusion map, not a bar chart
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                Ask one question. Instead of percentages, you get the groups of
                reasoning inside the room: who has the definition wrong, who is
                missing a prerequisite, who can compute but cannot choose. With
                a two-minute intervention and a counterexample ready to use.
              </p>
              <ul className="mt-4 space-y-1.5 text-[13px] text-slate-600">
                <li>· Live join code and real-time responses</li>
                <li>· Confusion groups with an AI reading of each</li>
                <li>· Ranked prerequisite gaps across the class</li>
                <li>· Follow-up question that separates the groups</li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Badge tone="violet">Student</Badge>
              <h3 className="mt-3 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">
                A diagnosis, then a repair
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                You don&rsquo;t have to know what you&rsquo;re confused about.
                Write what you thought, and ConceptLens names the belief behind
                it, shows why it fails, finds the missing prerequisite, and
                builds practice around your particular reasoning error.
              </p>
              <ul className="mt-4 space-y-1.5 text-[13px] text-slate-600">
                <li>· Misconception diagnosis with confidence, that you can reject</li>
                <li>· Shortest prerequisite repair path</li>
                <li>· ErrorTwin practice in unfamiliar contexts</li>
                <li>· Six explanation styles and multiple languages</li>
                <li>· Teach-back verification that closes the loop</li>
              </ul>
            </CardBody>
          </Card>
        </section>

        <section className="mt-10">
          <Card className="overflow-hidden">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.015em] text-slate-900">
                  The measurement that matters
                </h3>
                <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-slate-600">
                  The cycle only closes when a student explains the concept in
                  their own words and the evaluation confirms the original
                  misconception is gone — not when they watch a video or get one
                  multiple-choice question right.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { state: "Red", label: "Misconception present", cls: "bg-rose-50 border-rose-200 text-rose-700" },
                  { state: "Yellow", label: "Right answer, shaky reasoning", cls: "bg-amber-50 border-amber-200 text-amber-800" },
                  { state: "Green", label: "Understands and transfers", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                  { state: "Blue", label: "Can teach it to someone else", cls: "bg-sky-50 border-sky-200 text-sky-700" },
                ].map((item) => (
                  <div
                    key={item.state}
                    className={`rounded-xl border px-3 py-2.5 ${item.cls}`}
                  >
                    <div className="text-[13px] font-semibold">{item.state}</div>
                    <div className="mt-0.5 text-[11.5px] leading-snug opacity-90">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-[12.5px] text-slate-500 sm:px-6">
          <span>ThinkTrace AI — a hackathon MVP of the AhaLoop concept.</span>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-slate-700">
              How it works
            </Link>
            <Link href="/demo" className="hover:text-slate-700">
              Demo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
