import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CreateSessionForm } from "@/components/teacher/create-session-form";
import { Badge, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getModeInfo } from "@/lib/config";
import { isClassroom } from "@/lib/personal-space";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Your classrooms" };
export const dynamic = "force-dynamic";

export default async function TeacherHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "teacher") redirect("/student");

  const store = await getStore();
  const sessions = (await store.listSessionsForTeacher(user.id)).filter((s) =>
    isClassroom(s.topic),
  );

  const statusTone = {
    live: "green",
    lobby: "amber",
    ended: "neutral",
  } as const;

  return (
    <AppShell
      user={user}
      mode={getModeInfo()}
      nav={[{ href: "/teacher", label: "Classrooms", active: true }]}
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="order-2 lg:order-1">
          <Card>
            <CardHeader
              eyebrow="Teacher"
              title="Your classrooms"
              description="Each session has its own join code, questions and confusion maps."
            />
            <CardBody>
              {sessions.length === 0 ? (
                <EmptyState
                  icon="🎓"
                  title="No classrooms yet"
                  description="Create your first session, then read out the join code. Students answer, and ThinkTrace groups the room by how it is confused."
                  action={
                    <Link
                      href="/demo"
                      className="text-[13px] font-medium text-brand-600 hover:underline"
                    >
                      Or open the seeded demo classroom →
                    </Link>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {sessions.map((session) => (
                    <Card as="li" key={session.id} className="transition-shadow hover:shadow-md">
                      <Link
                        href={`/teacher/session/${session.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[14.5px] font-semibold text-slate-900">
                              {session.title}
                            </span>
                            <Badge tone={statusTone[session.status]}>
                              {session.status}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                            {session.topic}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-400">
                              Join code
                            </div>
                            <div className="font-mono text-[15px] font-semibold tracking-[0.12em] text-brand-700">
                              {session.joinCode}
                            </div>
                          </div>
                          <span aria-hidden="true" className="text-slate-300">
                            →
                          </span>
                        </div>
                      </Link>
                    </Card>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="order-1 lg:order-2">
          <CreateSessionForm />
        </div>
      </div>
    </AppShell>
  );
}
