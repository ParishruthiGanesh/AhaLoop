import { fail, guard, ok, readJson, requireString } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/**
 * A student submits an answer *and* the reasoning behind it. The reasoning is
 * the part ConceptLens actually diagnoses, so it is required.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await readJson<{
      questionId: string;
      selectedOptionId: string | null;
      answerText: string | null;
      reasoning: string;
    }>(request);

    const questionId = requireString(body.questionId, "Question", { max: 80 });
    const reasoning = requireString(body.reasoning, "Your reasoning", {
      min: 3,
      max: 4000,
    });

    const store = await getStore();
    const question = await store.getQuestion(questionId);
    if (!question) return fail("Question not found.", 404);
    if (question.status !== "published") {
      return fail("This question is not open for responses.", 409);
    }

    const participant = await store.findParticipantByUser(
      question.sessionId,
      user.id,
    );
    if (!participant) {
      return fail("Join the classroom before answering.", 403);
    }

    if (question.type === "mcq") {
      const selected = body.selectedOptionId;
      if (!selected || !question.options.some((o) => o.id === selected)) {
        return fail("Choose one of the options.");
      }
    }

    const response = await store.createResponse({
      questionId,
      sessionId: question.sessionId,
      participantId: participant.id,
      selectedOptionId:
        question.type === "mcq" ? (body.selectedOptionId ?? null) : null,
      answerText:
        question.type === "open" ? (body.answerText ?? reasoning) : null,
      reasoning,
    });

    // A submitted answer puts the student at the first stage of the cycle.
    await store.upsertMastery({
      sessionId: question.sessionId,
      participantId: participant.id,
      displayName: participant.displayName,
      concept: question.concept,
      state: response.isCorrect ? "yellow" : "red",
      stage: "answered",
    });

    return ok({ response }, 201);
  });
}
