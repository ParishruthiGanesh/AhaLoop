import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  generateJoinCode,
  type CreateQuestionInput,
  type CreateResponseInput,
  type CreateSessionInput,
  type JoinInput,
  type MasteryInput,
  type Store,
} from "./types";
import type {
  ClassSession,
  ConfusionMap,
  Diagnosis,
  LiveSnapshot,
  MasteryRecord,
  Participant,
  PracticeAttempt,
  Profile,
  Question,
  QuestionStatus,
  Response,
  Role,
  SessionStatus,
  TeachBack,
} from "../types";

/* Row shapes as stored in Postgres (snake_case). */
type ProfileRow = { id: string; email: string; full_name: string; role: Role };
type SessionRow = {
  id: string;
  teacher_id: string;
  title: string;
  topic: string;
  join_code: string;
  status: SessionStatus;
  created_at: string;
};
type ParticipantRow = {
  id: string;
  session_id: string;
  user_id: string | null;
  display_name: string;
  is_anonymous: boolean;
  joined_at: string;
};
type QuestionRow = {
  id: string;
  session_id: string;
  prompt: string;
  type: "mcq" | "open";
  options: { id: string; text: string }[];
  correct_option_id: string | null;
  concept: string;
  status: QuestionStatus;
  allow_anonymous: boolean;
  created_at: string;
  published_at: string | null;
};
type ResponseRow = {
  id: string;
  question_id: string;
  session_id: string;
  participant_id: string;
  selected_option_id: string | null;
  answer_text: string | null;
  reasoning: string;
  is_correct: boolean | null;
  created_at: string;
};
type MasteryRow = {
  id: string;
  session_id: string | null;
  participant_id: string;
  display_name: string;
  concept: string;
  state: MasteryRecord["state"];
  stage: MasteryRecord["stage"];
  updated_at: string;
};

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  role: r.role,
});

const toSession = (r: SessionRow): ClassSession => ({
  id: r.id,
  teacherId: r.teacher_id,
  title: r.title,
  topic: r.topic,
  joinCode: r.join_code,
  status: r.status,
  createdAt: r.created_at,
});

const toParticipant = (r: ParticipantRow): Participant => ({
  id: r.id,
  sessionId: r.session_id,
  userId: r.user_id,
  displayName: r.display_name,
  isAnonymous: r.is_anonymous,
  joinedAt: r.joined_at,
});

const toQuestion = (r: QuestionRow): Question => ({
  id: r.id,
  sessionId: r.session_id,
  prompt: r.prompt,
  type: r.type,
  options: Array.isArray(r.options) ? r.options : [],
  correctOptionId: r.correct_option_id,
  concept: r.concept,
  status: r.status,
  allowAnonymous: r.allow_anonymous,
  createdAt: r.created_at,
  publishedAt: r.published_at,
});

const toResponse = (r: ResponseRow): Response => ({
  id: r.id,
  questionId: r.question_id,
  sessionId: r.session_id,
  participantId: r.participant_id,
  selectedOptionId: r.selected_option_id,
  answerText: r.answer_text,
  reasoning: r.reasoning,
  isCorrect: r.is_correct,
  createdAt: r.created_at,
});

const toMastery = (r: MasteryRow): MasteryRecord => ({
  id: r.id,
  sessionId: r.session_id,
  participantId: r.participant_id,
  displayName: r.display_name,
  concept: r.concept,
  state: r.state,
  stage: r.stage,
  updatedAt: r.updated_at,
});

/**
 * Supabase-backed store. Analysis artefacts (confusion maps, diagnoses,
 * teach-back evaluations) are persisted as JSONB payloads so the AI contract
 * can evolve without a migration for every field.
 */
export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;

  constructor(private readonly db: SupabaseClient) {}

  /* profiles */
  async getProfile(id: string) {
    const { data } = await this.db
      .from("profiles")
      .select("id,email,full_name,role")
      .eq("id", id)
      .maybeSingle();
    return data ? toProfile(data as ProfileRow) : null;
  }

  async upsertProfile(profile: Profile) {
    await this.db.from("profiles").upsert({
      id: profile.id,
      email: profile.email,
      full_name: profile.fullName,
      role: profile.role,
    });
    return profile;
  }

  async findProfileByEmail(email: string) {
    const { data } = await this.db
      .from("profiles")
      .select("id,email,full_name,role")
      .ilike("email", email)
      .maybeSingle();
    return data ? toProfile(data as ProfileRow) : null;
  }

  async createDemoProfile(): Promise<Profile> {
    throw new Error(
      "Demo profiles are only available in demo mode. Sign up through Supabase Auth instead.",
    );
  }

  /* sessions */
  async createSession(input: CreateSessionInput) {
    // Retry on the (very unlikely) join-code collision.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await this.db
        .from("sessions")
        .insert({
          teacher_id: input.teacherId,
          title: input.title,
          topic: input.topic,
          join_code: generateJoinCode(),
        })
        .select()
        .single();
      if (!error && data) return toSession(data as SessionRow);
      if (error && error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Could not allocate a unique join code. Please try again.");
  }

  async getSession(id: string) {
    const { data } = await this.db
      .from("sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? toSession(data as SessionRow) : null;
  }

  async getSessionByCode(code: string) {
    // Goes through a security-definer function rather than a table select: the
    // sessions table is readable only by members, so that a signed-in stranger
    // cannot enumerate every classroom and its join code.
    const { data, error } = await this.db.rpc("session_by_code", {
      p_code: code.toUpperCase().trim(),
    });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as SessionRow[];
    return rows.length > 0 ? toSession(rows[0]) : null;
  }

  async listSessionsForTeacher(teacherId: string) {
    const { data } = await this.db
      .from("sessions")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });
    return ((data ?? []) as SessionRow[]).map(toSession);
  }

  async listSessionsForParticipantUser(userId: string) {
    const { data } = await this.db
      .from("participants")
      .select("session_id, sessions(*)")
      .eq("user_id", userId);
    const rows = (data ?? []) as unknown as {
      sessions: SessionRow | SessionRow[] | null;
    }[];
    return rows
      .flatMap((r) => (Array.isArray(r.sessions) ? r.sessions : [r.sessions]))
      .filter((s): s is SessionRow => Boolean(s))
      .map(toSession)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async setSessionStatus(id: string, status: SessionStatus) {
    const { data } = await this.db
      .from("sessions")
      .update({ status })
      .eq("id", id)
      .select()
      .maybeSingle();
    return data ? toSession(data as SessionRow) : null;
  }

  /* participants */
  async joinSession(input: JoinInput) {
    if (input.userId) {
      const existing = await this.findParticipantByUser(
        input.sessionId,
        input.userId,
      );
      if (existing) return existing;
    }
    const { data, error } = await this.db
      .from("participants")
      .insert({
        session_id: input.sessionId,
        user_id: input.userId,
        display_name: input.displayName,
        is_anonymous: input.isAnonymous,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toParticipant(data as ParticipantRow);
  }

  async listParticipants(sessionId: string) {
    const { data } = await this.db
      .from("participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("joined_at");
    return ((data ?? []) as ParticipantRow[]).map(toParticipant);
  }

  async getParticipant(id: string) {
    const { data } = await this.db
      .from("participants")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? toParticipant(data as ParticipantRow) : null;
  }

  async findParticipantByUser(sessionId: string, userId: string) {
    const { data } = await this.db
      .from("participants")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    return data ? toParticipant(data as ParticipantRow) : null;
  }

  async attachParticipantUser(participantId: string, userId: string) {
    const { data } = await this.db
      .from("participants")
      .update({ user_id: userId })
      .eq("id", participantId)
      .select()
      .maybeSingle();
    return data ? toParticipant(data as ParticipantRow) : null;
  }

  /* questions */
  async createQuestion(input: CreateQuestionInput) {
    const { data, error } = await this.db
      .from("questions")
      .insert({
        session_id: input.sessionId,
        prompt: input.prompt,
        type: input.type,
        options: input.options,
        correct_option_id: input.correctOptionId,
        concept: input.concept,
        allow_anonymous: input.allowAnonymous,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toQuestion(data as QuestionRow);
  }

  async listQuestions(sessionId: string) {
    const { data } = await this.db
      .from("questions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at");
    return ((data ?? []) as QuestionRow[]).map(toQuestion);
  }

  async getQuestion(id: string) {
    const { data } = await this.db
      .from("questions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? toQuestion(data as QuestionRow) : null;
  }

  async setQuestionStatus(id: string, status: QuestionStatus) {
    const patch: Record<string, unknown> = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    const { data } = await this.db
      .from("questions")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    return data ? toQuestion(data as QuestionRow) : null;
  }

  /* responses */
  async createResponse(input: CreateResponseInput) {
    const question = await this.getQuestion(input.questionId);
    const isCorrect =
      question?.correctOptionId != null && input.selectedOptionId != null
        ? input.selectedOptionId === question.correctOptionId
        : null;

    const { data, error } = await this.db
      .from("responses")
      .upsert(
        {
          question_id: input.questionId,
          session_id: input.sessionId,
          participant_id: input.participantId,
          selected_option_id: input.selectedOptionId,
          answer_text: input.answerText,
          reasoning: input.reasoning,
          is_correct: isCorrect,
        },
        { onConflict: "question_id,participant_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toResponse(data as ResponseRow);
  }

  async listResponsesForSession(sessionId: string) {
    const { data } = await this.db
      .from("responses")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at");
    return ((data ?? []) as ResponseRow[]).map(toResponse);
  }

  async listResponsesForQuestion(questionId: string) {
    const { data } = await this.db
      .from("responses")
      .select("*")
      .eq("question_id", questionId)
      .order("created_at");
    return ((data ?? []) as ResponseRow[]).map(toResponse);
  }

  async getResponse(id: string) {
    const { data } = await this.db
      .from("responses")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? toResponse(data as ResponseRow) : null;
  }

  async findResponse(questionId: string, participantId: string) {
    const { data } = await this.db
      .from("responses")
      .select("*")
      .eq("question_id", questionId)
      .eq("participant_id", participantId)
      .maybeSingle();
    return data ? toResponse(data as ResponseRow) : null;
  }

  /* analysis artefacts */
  async saveConfusionMap(map: ConfusionMap) {
    const question = await this.getQuestion(map.questionId);
    await this.db.from("confusion_maps").upsert(
      {
        question_id: map.questionId,
        session_id: question?.sessionId,
        payload: map,
      },
      { onConflict: "question_id" },
    );
    return map;
  }

  async listConfusionMaps(sessionId: string) {
    const { data } = await this.db
      .from("confusion_maps")
      .select("payload")
      .eq("session_id", sessionId);
    return ((data ?? []) as { payload: ConfusionMap }[]).map((r) => r.payload);
  }

  async saveDiagnosis(diagnosis: Diagnosis) {
    const { data, error } = await this.db
      .from("diagnoses")
      .upsert(
        {
          response_id: diagnosis.responseId,
          participant_id: diagnosis.participantId,
          session_id: diagnosis.sessionId,
          payload: diagnosis,
        },
        { onConflict: "response_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // Persist the database-assigned id inside the payload so later lookups
    // by `diagnosis.id` resolve.
    const withId = { ...diagnosis, id: (data as { id: string }).id };
    await this.db
      .from("diagnoses")
      .update({ payload: withId })
      .eq("id", withId.id);
    return withId;
  }

  async getDiagnosis(id: string) {
    const { data } = await this.db
      .from("diagnoses")
      .select("id,payload")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const row = data as { id: string; payload: Diagnosis };
    return { ...row.payload, id: row.id };
  }

  async findDiagnosisByResponse(responseId: string) {
    const { data } = await this.db
      .from("diagnoses")
      .select("id,payload")
      .eq("response_id", responseId)
      .maybeSingle();
    if (!data) return null;
    const row = data as { id: string; payload: Diagnosis };
    return { ...row.payload, id: row.id };
  }

  async listDiagnosesForParticipant(participantId: string) {
    const { data } = await this.db
      .from("diagnoses")
      .select("id,payload")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false });
    return ((data ?? []) as { id: string; payload: Diagnosis }[]).map((r) => ({
      ...r.payload,
      id: r.id,
    }));
  }

  async updateDiagnosis(id: string, patch: Partial<Diagnosis>) {
    const existing = await this.getDiagnosis(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id };
    await this.db.from("diagnoses").update({ payload: updated }).eq("id", id);
    return updated;
  }

  async savePracticeAttempt(attempt: PracticeAttempt) {
    await this.db.from("practice_attempts").upsert(
      {
        diagnosis_id: attempt.diagnosisId,
        question_id: attempt.questionId,
        selected_option_id: attempt.selectedOptionId,
        is_correct: attempt.isCorrect,
        repeated_misconception: attempt.repeatedMisconception,
      },
      { onConflict: "diagnosis_id,question_id" },
    );
    return attempt;
  }

  async listPracticeAttempts(diagnosisId: string) {
    const { data } = await this.db
      .from("practice_attempts")
      .select("*")
      .eq("diagnosis_id", diagnosisId);
    return ((data ?? []) as Record<string, string & boolean>[]).map((r) => ({
      id: r.id as unknown as string,
      diagnosisId: r.diagnosis_id as unknown as string,
      questionId: r.question_id as unknown as string,
      selectedOptionId: r.selected_option_id as unknown as string,
      isCorrect: Boolean(r.is_correct),
      repeatedMisconception: Boolean(r.repeated_misconception),
      createdAt: r.created_at as unknown as string,
    }));
  }

  async saveTeachBack(teachBack: TeachBack) {
    const { data, error } = await this.db
      .from("teach_backs")
      .insert({
        diagnosis_id: teachBack.diagnosisId,
        participant_id: teachBack.participantId,
        prompt: teachBack.prompt,
        text: teachBack.text,
        evaluation: teachBack.evaluation,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ...teachBack, id: (data as { id: string }).id };
  }

  async listTeachBacks(diagnosisId: string) {
    const { data } = await this.db
      .from("teach_backs")
      .select("*")
      .eq("diagnosis_id", diagnosisId)
      .order("created_at", { ascending: false });
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      diagnosisId: r.diagnosis_id as string,
      participantId: r.participant_id as string,
      prompt: r.prompt as string,
      text: r.text as string,
      evaluation: r.evaluation as TeachBack["evaluation"],
      createdAt: r.created_at as string,
    }));
  }

  async upsertMastery(input: MasteryInput) {
    const { data, error } = await this.db
      .from("mastery")
      .upsert(
        {
          session_id: input.sessionId,
          participant_id: input.participantId,
          display_name: input.displayName,
          concept: input.concept,
          state: input.state,
          stage: input.stage,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "participant_id,concept" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toMastery(data as MasteryRow);
  }

  async listMastery(sessionId: string) {
    const { data } = await this.db
      .from("mastery")
      .select("*")
      .eq("session_id", sessionId);
    return ((data ?? []) as MasteryRow[]).map(toMastery);
  }

  async listMasteryForParticipant(participantId: string) {
    const { data } = await this.db
      .from("mastery")
      .select("*")
      .eq("participant_id", participantId);
    return ((data ?? []) as MasteryRow[]).map(toMastery);
  }

  /* live */
  async getSnapshot(sessionId: string): Promise<LiveSnapshot | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    const [participants, questions, responses, confusionMaps, mastery] =
      await Promise.all([
        this.listParticipants(sessionId),
        this.listQuestions(sessionId),
        this.listResponsesForSession(sessionId),
        this.listConfusionMaps(sessionId),
        this.listMastery(sessionId),
      ]);
    return {
      session,
      participants,
      questions,
      responses,
      confusionMaps,
      mastery,
      // Postgres has no session-wide counter; a content hash gives clients
      // the same "did anything change?" signal.
      revision: hashRevision([
        ...responses.map((r) => `${r.id}:${r.createdAt}`),
        ...participants.map((p) => p.id),
        ...questions.map((q) => `${q.id}:${q.status}`),
        ...confusionMaps.map((c) => `${c.questionId}:${c.createdAt}`),
        ...mastery.map((m) => `${m.id}:${m.state}:${m.stage}:${m.updatedAt}`),
      ]),
    };
  }
}

/** Stable 32-bit hash over the snapshot's identifying strings. */
function hashRevision(parts: string[]): number {
  let hash = 2166136261;
  for (const part of parts.sort()) {
    for (let i = 0; i < part.length; i += 1) {
      hash ^= part.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}
