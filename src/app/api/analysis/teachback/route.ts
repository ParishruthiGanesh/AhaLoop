import { fail, guard, ok, readJson, requireString } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { assessTeachBack } from "@/lib/ai/analysis";
import { getStore } from "@/lib/store";
import { newId } from "@/lib/store/types";
import type { TeachBack } from "@/lib/types";

/**
 * Teach-back verification — the only exit from the cycle.
 *
 * The student explains the concept in their own words and the evaluation
 * decides whether the *original* misconception is actually gone. If it is
 * not, the student goes back round; if it is, the teacher dashboard updates.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await readJson<{
      diagnosisId: string;
      text: string;
      prompt?: string;
    }>(request);

    const diagnosisId = requireString(body.diagnosisId, "Diagnosis", { max: 80 });
    const text = requireString(body.text, "Your explanation", {
      min: 10,
      max: 5000,
    });

    const store = await getStore();
    const diagnosis = await store.getDiagnosis(diagnosisId);
    if (!diagnosis) return fail("Diagnosis not found.", 404);

    const participant = await store.getParticipant(diagnosis.participantId);
    if (participant?.userId && participant.userId !== user.id) {
      return fail("That diagnosis belongs to another student.", 403);
    }

    const prompt =
      (body.prompt ?? "").trim() ||
      "Explain why a 95% accuracy score might still describe a poor fraud-detection model.";

    const evaluation = await assessTeachBack({
      text,
      prompt,
      concept: diagnosis.concept,
      misconception: diagnosis.misconception,
    });

    const teachBack: TeachBack = {
      id: newId("tbk"),
      diagnosisId,
      participantId: diagnosis.participantId,
      prompt,
      text,
      evaluation,
      createdAt: new Date().toISOString(),
    };
    await store.saveTeachBack(teachBack);

    await store.updateDiagnosis(diagnosisId, {
      masteryState: evaluation.masteryState,
    });

    if (participant) {
      await store.upsertMastery({
        sessionId: diagnosis.sessionId,
        participantId: participant.id,
        displayName: participant.displayName,
        concept: diagnosis.concept,
        state: evaluation.masteryState,
        stage: evaluation.resolved ? "resolved" : "teach-back",
      });
    }

    return ok({ teachBack, evaluation });
  });
}

export const maxDuration = 60;
