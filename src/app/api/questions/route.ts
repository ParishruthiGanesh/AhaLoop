import { fail, guard, ok, readJson, requireString } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { QuestionOption, QuestionType } from "@/lib/types";

export async function POST(request: Request) {
  return guard(async () => {
    const teacher = await requireRole("teacher");
    const body = await readJson<{
      sessionId: string;
      prompt: string;
      type: QuestionType;
      options: QuestionOption[];
      correctOptionId: string | null;
      concept: string;
      allowAnonymous: boolean;
      publish?: boolean;
    }>(request);

    const sessionId = requireString(body.sessionId, "Session", { max: 80 });
    const prompt = requireString(body.prompt, "Question", { max: 2000 });
    const concept = requireString(body.concept, "Concept", { max: 200 });
    const type: QuestionType = body.type === "open" ? "open" : "mcq";

    const store = await getStore();
    const session = await store.getSession(sessionId);
    if (!session) return fail("Session not found.", 404);
    if (session.teacherId !== teacher.id) {
      return fail("This is not your session.", 403);
    }

    let options: QuestionOption[] = [];
    let correctOptionId: string | null = null;

    if (type === "mcq") {
      options = (Array.isArray(body.options) ? body.options : [])
        .map((option, index) => ({
          id: option?.id?.trim() || String.fromCharCode(97 + index),
          text: (option?.text ?? "").trim(),
        }))
        .filter((option) => option.text.length > 0);

      if (options.length < 2) {
        return fail("A multiple-choice question needs at least two options.");
      }
      correctOptionId = body.correctOptionId ?? null;
      if (!correctOptionId || !options.some((o) => o.id === correctOptionId)) {
        return fail("Mark which option is correct.");
      }
    }

    const question = await store.createQuestion({
      sessionId,
      prompt,
      type,
      options,
      correctOptionId,
      concept,
      allowAnonymous: Boolean(body.allowAnonymous),
    });

    if (body.publish) {
      const published = await store.setQuestionStatus(question.id, "published");
      // Publishing a question opens the floor, so the session goes live.
      if (session.status === "lobby") {
        await store.setSessionStatus(sessionId, "live");
      }
      return ok({ question: published ?? question }, 201);
    }

    return ok({ question }, 201);
  });
}
