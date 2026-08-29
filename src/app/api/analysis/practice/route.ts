import { fail, guard, ok, readJson, requireString } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { newId } from "@/lib/store/types";
import type { PracticeAttempt } from "@/lib/types";

/**
 * Records one ErrorTwin practice answer and reports whether the student
 * repeated their original reasoning error rather than merely getting it wrong.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await readJson<{
      diagnosisId: string;
      questionId: string;
      selectedOptionId: string;
    }>(request);

    const diagnosisId = requireString(body.diagnosisId, "Diagnosis", { max: 80 });
    const questionId = requireString(body.questionId, "Question", { max: 80 });
    const selectedOptionId = requireString(body.selectedOptionId, "Answer", {
      max: 20,
    });

    const store = await getStore();
    const diagnosis = await store.getDiagnosis(diagnosisId);
    if (!diagnosis) return fail("Diagnosis not found.", 404);

    const participant = await store.getParticipant(diagnosis.participantId);
    if (participant?.userId && participant.userId !== user.id) {
      return fail("That practice set belongs to another student.", 403);
    }

    const question = diagnosis.errorTwin.questions.find(
      (q) => q.id === questionId,
    );
    if (!question) return fail("Practice question not found.", 404);
    if (!question.options.some((o) => o.id === selectedOptionId)) {
      return fail("Choose one of the options.");
    }

    const isCorrect = selectedOptionId === question.correctOptionId;

    const attempt: PracticeAttempt = {
      id: newId("prc"),
      diagnosisId,
      questionId,
      selectedOptionId,
      isCorrect,
      // Every ErrorTwin item carries one distractor built from the original
      // misconception; picking it is a relapse, not a random miss.
      repeatedMisconception: !isCorrect,
      createdAt: new Date().toISOString(),
    };
    await store.savePracticeAttempt(attempt);

    const attempts = await store.listPracticeAttempts(diagnosisId);
    const total = diagnosis.errorTwin.questions.length;
    const correct = attempts.filter((a) => a.isCorrect).length;
    const complete = attempts.length >= total;

    // Mastery advances only once the whole set is done, and only as far as the
    // evidence supports: all correct is "green", anything less stays "yellow".
    if (complete && participant) {
      await store.upsertMastery({
        sessionId: diagnosis.sessionId,
        participantId: participant.id,
        displayName: participant.displayName,
        concept: diagnosis.concept,
        state: correct === total ? "green" : correct > 0 ? "yellow" : "red",
        stage: "practising",
      });
    }

    return ok({
      attempt,
      isCorrect,
      trapExplanation: question.trapExplanation,
      correctOptionId: question.correctOptionId,
      progress: { answered: attempts.length, correct, total, complete },
    });
  });
}
