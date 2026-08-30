import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { JoinForm } from "@/components/student/join-form";
import { getCurrentUser } from "@/lib/auth";
import { getModeInfo } from "@/lib/config";

export const metadata: Metadata = { title: "Join a classroom" };

export default async function JoinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      user={user}
      mode={getModeInfo()}
      nav={[
        { href: "/student", label: "My learning" },
        { href: "/join", label: "Join", active: true },
      ]}
    >
      <div className="mx-auto max-w-md py-6">
        <JoinForm />
      </div>
    </AppShell>
  );
}
