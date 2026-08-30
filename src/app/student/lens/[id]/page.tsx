import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { LensJourney } from "@/components/lens/lens-journey";
import { getCurrentUser } from "@/lib/auth";
import { getModeInfo } from "@/lib/config";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "ConceptLens" };
export const dynamic = "force-dynamic";

export default async function LensPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const store = await getStore();
  const diagnosis = await store.getDiagnosis(id);
  if (!diagnosis) notFound();

  const participant = await store.getParticipant(diagnosis.participantId);
  if (participant?.userId && participant.userId !== user.id) {
    redirect("/student");
  }

  return (
    <AppShell
      user={user}
      mode={getModeInfo()}
      nav={[
        { href: "/student", label: "My learning" },
        { href: `/student/lens/${id}`, label: "ConceptLens", active: true },
      ]}
    >
      <div className="mx-auto max-w-3xl">
        <LensJourney
          diagnosis={diagnosis}
          teachBackPrompt={buildTeachBackPrompt(diagnosis.concept)}
        />
      </div>
    </AppShell>
  );
}

function buildTeachBackPrompt(concept: string): string {
  if (/accuracy|precision|recall|imbalance/i.test(concept)) {
    return "Explain why a model with 95% accuracy might still be a poor fraud-detection model — to a classmate who has never heard the word 'recall'.";
  }
  return `Explain ${concept} in your own words, to someone who has just got it wrong for the same reason you did.`;
}
