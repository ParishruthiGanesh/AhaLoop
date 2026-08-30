import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { MASTERY_META, MasteryLegend, StageBadge } from "@/components/mastery";
import { SelfDiagnoseForm } from "@/components/student/self-diagnose-form";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  cn,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getModeInfo } from "@/lib/config";
import { isClassroom } from "@/lib/personal-space";
import { getStore } from "@/lib/store";
import type { Diagnosis, MasteryRecord } from "@/lib/types";

export const metadata: Metadata = { title: "My learning" };
export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "teacher") redirect("/teacher");

  const store = await getStore();
  const allSessions = await store.listSessionsForParticipantUser(user.id);
  const sessions = allSessions.filter((s) => isClassroom(s.topic));

  // Gather this student's diagnoses and mastery across every space they're in.
  const diagnoses: Diagnosis[] = [];
  const mastery: MasteryRecord[] = [];
  for (const session of allSessions) {
    const participant = await store.findParticipantByUser(session.id, user.id);
    if (!participant) continue;
    diagnoses.push(...(await store.listDiagnosesForParticipant(participant.id)));
    mastery.push(...(await store.listMasteryForParticipant(participant.id)));
  }

  const uniqueMastery = [...new Map(mastery.map((m) => [m.id, m])).values()];

  return (
    <AppShell
      user={user}
      mode={getModeInfo()}
      nav={[
        { href: "/student", label: "My learning", active: true },
        { href: "/join", label: "Join a classroom" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">
              {greeting(user.fullName)}
            </h1>
            <p className="mt-0.5 text-[13.5px] text-slate-500">
              Pick up an open diagnosis, or start from something you&rsquo;re
              stuck on.
            </p>
          </div>
          <Link href="/join">
            <Button variant="secondary" size="sm">
              Join with a code
            </Button>
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card>
              <CardHeader
                eyebrow="Your classrooms"
                title="Live sessions"
                description="Sessions you've joined with a code."
              />
              <CardBody>
                {sessions.length === 0 ? (
                  <EmptyState
                    icon="🏫"
                    title="You haven't joined a classroom yet"
                    description="Ask your teacher for the six-character join code."
                    action={
                      <Link href="/join">
                        <Button size="sm">Enter a join code</Button>
                      </Link>
                    }
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {sessions.map((session) => (
                      <li key={session.id}>
                        <Link
                          href={`/student/session/${session.id}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-slate-300"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[14px] font-medium text-slate-900">
                                {session.title}
                              </span>
                              <Badge
                                tone={session.status === "live" ? "green" : "neutral"}
                              >
                                {session.status}
                              </Badge>
                            </div>
                            <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                              {session.topic}
                            </p>
                          </div>
                          <span aria-hidden="true" className="text-slate-300">
                            →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                eyebrow="ConceptLens"
                title="Your diagnoses"
                description="Each one is a reasoning error, and the path built to repair it."
              />
              <CardBody>
                {diagnoses.length === 0 ? (
                  <EmptyState
                    icon="🔍"
                    title="No diagnoses yet"
                    description="Answer a question in class, or describe what you're stuck on, and ConceptLens will read the reasoning behind it."
                  />
                ) : (
                  <ul className="space-y-2.5">
                    {diagnoses.map((diagnosis) => (
                      <li key={diagnosis.id}>
                        <Link
                          href={`/student/lens/${diagnosis.id}`}
                          className="block rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-slate-300"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-2 rounded-full",
                                MASTERY_META[diagnosis.masteryState].dot,
                              )}
                            />
                            <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-slate-500">
                              {diagnosis.concept}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-800">
                            {diagnosis.misconception}
                          </p>
                          <p className="mt-1.5 text-[12px] text-slate-500">
                            Diagnosis confidence{" "}
                            {Math.round(diagnosis.confidence * 100)}%
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-5">
            <SelfDiagnoseForm />

            <Card>
              <CardHeader
                eyebrow="Progress"
                title="Concepts you're tracking"
              />
              <CardBody className="space-y-4">
                {uniqueMastery.length === 0 ? (
                  <EmptyState
                    icon="📊"
                    title="Nothing tracked yet"
                    description="Your understanding of each concept appears here and moves as you work through the cycle."
                  />
                ) : (
                  <>
                    <ul className="space-y-2">
                      {uniqueMastery.map((record) => (
                        <li
                          key={record.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-2.5 shrink-0 rounded-full",
                                MASTERY_META[record.state].dot,
                              )}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-slate-900">
                                {record.concept}
                              </p>
                              <p className="text-[11.5px] text-slate-500">
                                {MASTERY_META[record.state].meaning}
                              </p>
                            </div>
                          </div>
                          <StageBadge stage={record.stage} />
                        </li>
                      ))}
                    </ul>
                    <MasteryLegend />
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function greeting(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first ? `Hello, ${first}` : "My learning";
}
