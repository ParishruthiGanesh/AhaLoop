import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { SessionRoom } from "@/components/teacher/session-room";
import { getCurrentUser } from "@/lib/auth";
import { getModeInfo } from "@/lib/config";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Live classroom" };
export const dynamic = "force-dynamic";

export default async function TeacherSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "teacher") redirect("/student");

  const { id } = await params;
  const store = await getStore();
  const snapshot = await store.getSnapshot(id);
  if (!snapshot) notFound();
  if (snapshot.session.teacherId !== user.id) redirect("/teacher");

  return (
    <AppShell
      user={user}
      mode={getModeInfo()}
      nav={[
        { href: "/teacher", label: "Classrooms" },
        {
          href: `/teacher/session/${id}`,
          label: "Live session",
          active: true,
        },
      ]}
    >
      <SessionRoom initial={snapshot} />
    </AppShell>
  );
}
