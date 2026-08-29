import { fail, guard, ok, readJson, requireString } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { diagnoseResponse } from "@/lib/ai/analysis";
import { SAMPLE_CONCEPT } from "@/lib/lesson";
import { ensurePersonalParticipant } from "@/lib/personal-space";
import { getStore } from "@/lib/store";
import { newId } from "@/lib/store/types";
import type { Diagnosis } from "@/lib/types";

/**
 * ConceptLens. Two entry points:
 *  - `responseId`: diagnose an answer the student gave in class.
 *  - `reasoning` + `concept`: the student brings their own confusion.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const store = await getStore();
    const body = await readJson<{
      responseId?: string;
      reasoning?: string;
      concept?: string;
      sessionId?: string;
      force?: boolean;
    }>(request);

    if (body.responseId) {
      const response = await store.getResponse(body.responseId);
      if (!response) return fail("Response not found.", 404);

      const participant = await store.getParticipant(response.participantId);
      if (!participant) return fail("Participant not found.", 404);
      if (participant.userId && participant.userId !== user.id) {
        return fail("That response belongs to another student.", 403);
      }

      if (!body.force) {
        const existing = await store.findDiagnosisByResponse(response.id);
        if (existing) return ok({ diagnosis: existing, cached: true });
      }

      const question = await store.getQuestion(response.questionId);
      if (!question) return fail("Question not found.", 404);

      const result = await diagnoseResponse({
        reasoning: response.reasoning,
        selectedOptionId: response.selectedOptionId,
        selectedOptionText:
          question.options.find((o) => o.id === response.selectedOptionId)
            ?.text ?? response.answerText,
        correctOptionId: question.correctOptionId,
        correctOptionText:
          question.options.find((o) => o.id === question.correctOptionId)
            ?.text ?? null,
        questionPrompt: question.prompt,
        concept: question.concept,
      });

      const diagnosis: Diagnosis = {
        id: newId("dgn"),
        responseId: response.id,
        participantId: participant.id,
        sessionId: question.sessionId,
        concept: question.concept,
        studentReasoning: response.reasoning,
        studentFeedback: null,
        createdAt: new Date().toISOString(),
        ...result,
      };

      const saved = await store.saveDiagnosis(diagnosis);
      await store.upsertMastery({
        sessionId: question.sessionId,
        participantId: participant.id,
        displayName: participant.displayName,
        concept: question.concept,
        state: result.masteryState,
        stage: "diagnosed",
      });

      return ok({ diagnosis: saved, cached: false });
    }

    /* Student-initiated diagnosis, outside any classroom question. */
    const reasoning = requireString(body.reasoning, "Your thinking", {
      min: 5,
      max: 4000,
    });
    const concept = (body.concept ?? "").trim() || SAMPLE_CONCEPT;

    // Diagnoses always hang off a participant row. If the student is not in a
    // classroom, use their private self-study space so the same code path and
    // the same foreign keys apply.
    const participant = body.sessionId
      ? ((await store.findParticipantByUser(body.sessionId, user.id)) ??
        (await ensurePersonalParticipant(store, user)))
      : await ensurePersonalParticipant(store, user);

    const sessionId = participant.sessionId;

    const result = await diagnoseResponse({
      reasoning,
      selectedOptionId: null,
      selectedOptionText: null,
      correctOptionId: null,
      correctOptionText: null,
      questionPrompt: `The student is working on: ${concept}`,
      concept,
    });

    const diagnosis: Diagnosis = {
      id: newId("dgn"),
      responseId: null,
      participantId: participant.id,
      sessionId,
      concept,
      studentReasoning: reasoning,
      studentFeedback: null,
      createdAt: new Date().toISOString(),
      ...result,
    };

    const saved = await store.saveDiagnosis(diagnosis);
    await store.upsertMastery({
      sessionId,
      participantId: participant.id,
      displayName: participant.displayName,
      concept,
      state: result.masteryState,
      stage: "diagnosed",
    });

    return ok({ diagnosis: saved, cached: false });
  });
}

export const maxDuration = 60;
