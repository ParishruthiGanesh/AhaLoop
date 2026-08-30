import { fail, guard, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { QuestionStatus } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guard(async () => {
    const teacher = await requireRole("teacher");
    const { id } = await params;
    const body = await readJson<{ status: QuestionStatus }>(request);
    const status: QuestionStatus =
      body.status === "closed" ? "closed" : "published";

    const store = await getStore();
    const question = await store.getQuestion(id);
    if (!question) return fail("Question not found.", 404);

    const session = await store.getSession(question.sessionId);
    if (!session || session.teacherId !== teacher.id) {
      return fail("This is not your session.", 403);
    }

    const updated = await store.setQuestionStatus(id, status);
    if (status === "published" && session.status === "lobby") {
      await store.setSessionStatus(session.id, "live");
    }
    return ok({ question: updated });
  });
}
