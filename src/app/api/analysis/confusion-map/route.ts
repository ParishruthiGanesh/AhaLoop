import { fail, guard, ok, readJson, requireString } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { analyzeConfusion } from "@/lib/ai/analysis";
import { getStore } from "@/lib/store";

/** LecturePulse: analyse every response to one question as a class. */
export async function POST(request: Request) {
  return guard(async () => {
    const teacher = await requireRole("teacher");
    const body = await readJson<{ questionId: string }>(request);
    const questionId = requireString(body.questionId, "Question", { max: 80 });

    const store = await getStore();
    const question = await store.getQuestion(questionId);
    if (!question) return fail("Question not found.", 404);

    const session = await store.getSession(question.sessionId);
    if (!session || session.teacherId !== teacher.id) {
      return fail("This is not your session.", 403);
    }

    const responses = await store.listResponsesForQuestion(questionId);
    if (responses.length === 0) {
      return fail(
        "No responses to analyse yet. Wait for students to answer.",
        409,
      );
    }

    const participants = await store.listParticipants(question.sessionId);
    const map = await analyzeConfusion(question, responses, participants);
    await store.saveConfusionMap(map);

    return ok({ confusionMap: map });
  });
}

export const maxDuration = 60;
