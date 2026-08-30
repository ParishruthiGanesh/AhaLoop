import { cookies } from "next/headers";

import { guard, ok, readJson } from "@/lib/api";
import { DEMO_COOKIE, getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  SAMPLE_CONCEPT,
  SAMPLE_CORRECT_OPTION_ID,
  SAMPLE_OPTIONS,
  SAMPLE_QUESTION_PROMPT,
  SEED_STUDENTS,
} from "@/lib/lesson";
import { getStore } from "@/lib/store";

const DEMO_TEACHER = {
  email: "priya.raman@demo.thinktrace.ai",
  fullName: "Dr Priya Raman",
  role: "teacher" as const,
};

const SESSION_TITLE = "ML Evaluation — Week 6";

/**
 * Builds the seeded demonstration classroom: one teacher, one published
 * question on the sample lesson, and five simulated students whose written
 * reasoning spans genuinely different misconceptions.
 *
 * Everything created here is demonstration data and is labelled as such in
 * the UI. In demo mode this also signs the visitor in, so the whole flow is
 * reachable in one click.
 */
export async function POST(request: Request) {
  return guard(async () => {
    const body = await readJson<{ as: "teacher" | "student" }>(request);
    const as = body.as === "student" ? "student" : "teacher";
    const store = await getStore();
    const cookieStore = await cookies();

    /* ---- who owns the seeded classroom ---- */
    let teacherId: string;

    if (isSupabaseConfigured) {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("Sign in first — seeding needs an account to own the session.");
      }
      if (user.role !== "teacher") {
        throw new Error(
          "Sign in as a teacher to seed the demonstration classroom.",
        );
      }
      teacherId = user.id;
    } else {
      const teacher = await store.createDemoProfile(DEMO_TEACHER);
      teacherId = teacher.id;
    }

    /* ---- reuse an existing seeded session rather than duplicating ---- */
    const existing = await store.listSessionsForTeacher(teacherId);
    const session =
      existing.find((s) => s.title === SESSION_TITLE) ??
      (await store.createSession({
        teacherId,
        title: SESSION_TITLE,
        topic: "Accuracy, precision, recall and class imbalance",
      }));

    const questions = await store.listQuestions(session.id);
    let question =
      questions.find((q) => q.prompt === SAMPLE_QUESTION_PROMPT) ?? null;

    if (!question) {
      question = await store.createQuestion({
        sessionId: session.id,
        prompt: SAMPLE_QUESTION_PROMPT,
        type: "mcq",
        options: SAMPLE_OPTIONS,
        correctOptionId: SAMPLE_CORRECT_OPTION_ID,
        concept: SAMPLE_CONCEPT,
        allowAnonymous: false,
      });
      question = (await store.setQuestionStatus(question.id, "published")) ?? question;
    }
    await store.setSessionStatus(session.id, "live");

    /* ---- five simulated students, each with distinct reasoning ---- */
    const seededParticipants = [];
    for (const student of SEED_STUDENTS) {
      const participants = await store.listParticipants(session.id);
      const participant =
        participants.find((p) => p.displayName === student.name) ??
        (await store.joinSession({
          sessionId: session.id,
          userId: null,
          displayName: student.name,
          isAnonymous: false,
        }));

      const already = await store.findResponse(question.id, participant.id);
      if (!already) {
        await store.createResponse({
          questionId: question.id,
          sessionId: session.id,
          participantId: participant.id,
          selectedOptionId: student.selectedOptionId,
          answerText: null,
          reasoning: student.reasoning,
        });
        await store.upsertMastery({
          sessionId: session.id,
          participantId: participant.id,
          displayName: participant.displayName,
          concept: SAMPLE_CONCEPT,
          state:
            student.selectedOptionId === SAMPLE_CORRECT_OPTION_ID
              ? "yellow"
              : "red",
          stage: "answered",
        });
      }
      seededParticipants.push(participant);
    }

    /* ---- sign the visitor in (demo mode only) ---- */
    let redirectTo = `/teacher/session/${session.id}`;

    if (!isSupabaseConfigured) {
      if (as === "teacher") {
        const teacher = await store.createDemoProfile(DEMO_TEACHER);
        cookieStore.set(DEMO_COOKIE, teacher.id, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
      } else {
        // Step into the shoes of the first simulated student, who already has
        // an incorrect answer waiting to be diagnosed.
        const seed = SEED_STUDENTS[0];
        const profile = await store.createDemoProfile({
          email: "aarav.menon@demo.thinktrace.ai",
          fullName: seed.name,
          role: "student",
        });
        cookieStore.set(DEMO_COOKIE, profile.id, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        // Bind the account to the participant row that already answered, so
        // the visitor inherits Aarav's incorrect response rather than starting
        // a duplicate, empty participant.
        const participant = seededParticipants[0];
        if (participant.userId !== profile.id) {
          await store.attachParticipantUser(participant.id, profile.id);
        }
        redirectTo = `/student/session/${session.id}`;
      }
    }

    return ok({
      session,
      question,
      participants: seededParticipants.length,
      redirectTo,
    });
  });
}
