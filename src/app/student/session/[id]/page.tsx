import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AnswerPanel } from "@/components/student/answer-panel";
import { Card, CardBody, EmptyState } from "@/components/ui";
import { Button } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getModeInfo } from "@/lib/config";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Live question" };
export const dynamic = "force-dynamic";

export default async function StudentSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "teacher") redirect("/teacher");

  const { id } = await params;
  const store = await getStore();
  const snapshot = await store.getSnapshot(id);
  if (!snapshot) notFound();

  const participant = await store.findParticipantByUser(id, user.id);

  const shell = (children: React.ReactNode) => (
    <AppShell
      user={user}
      mode={getModeInfo()}
      nav={[
        { href: "/student", label: "My learning" },
        { href: `/student/session/${id}`, label: "Live question", active: true },
      ]}
    >
      <div className="mx-auto max-w-2xl">{children}</div>
    </AppShell>
  );

  if (!participant) {
    return shell(
      <Card>
        <CardBody>
          <EmptyState
            icon="🔑"
            title="You haven't joined this classroom"
            description="Enter the join code your teacher is showing to take part."
            action={
              <Link href="/join">
                <Button size="sm">Enter a join code</Button>
              </Link>
            }
          />
        </CardBody>
      </Card>,
    );
  }

  // If this student already has a diagnosis for their answer, link straight to
  // it rather than re-running the analysis.
  const published = [...snapshot.questions]
    .reverse()
    .find((q) => q.status === "published");
  const myResponse = published
    ? await store.findResponse(published.id, participant.id)
    : null;
  const existing = myResponse
    ? await store.findDiagnosisByResponse(myResponse.id)
    : null;

  return shell(
    <AnswerPanel
      initial={snapshot}
      participantId={participant.id}
      existingDiagnosisId={existing?.id ?? null}
    />,
  );
}
