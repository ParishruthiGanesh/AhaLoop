import { fail, guard, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { Diagnosis } from "@/lib/types";

const VALID: Diagnosis["studentFeedback"][] = ["confirmed", "rejected", "unsure"];

/**
 * The student's own verdict on the diagnosis ("yes, that is what I thought" /
 * "that is not my confusion" / "still unsure"). Rejecting a diagnosis moves
 * the student back to the start of the cycle rather than pushing them through
 * practice built on the wrong premise.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await readJson<{
      diagnosisId: string;
      feedback: Diagnosis["studentFeedback"];
    }>(request);

    if (!body.diagnosisId) return fail("Diagnosis is required.");
    if (!VALID.includes(body.feedback ?? null)) {
      return fail("Feedback must be confirmed, rejected or unsure.");
    }

    const store = await getStore();
    const diagnosis = await store.getDiagnosis(body.diagnosisId);
    if (!diagnosis) return fail("Diagnosis not found.", 404);

    const participant = await store.getParticipant(diagnosis.participantId);
    if (participant?.userId && participant.userId !== user.id) {
      return fail("That diagnosis belongs to another student.", 403);
    }

    const updated = await store.updateDiagnosis(body.diagnosisId, {
      studentFeedback: body.feedback ?? null,
    });

    if (participant) {
      await store.upsertMastery({
        sessionId: diagnosis.sessionId,
        participantId: participant.id,
        displayName: participant.displayName,
        concept: diagnosis.concept,
        state: diagnosis.masteryState,
        stage: body.feedback === "rejected" ? "answered" : "repairing",
      });
    }

    return ok({ diagnosis: updated });
  });
}
