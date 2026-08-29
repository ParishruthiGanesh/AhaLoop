import {
  generateJoinCode,
  newId,
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

/**
 * In-memory store used when Supabase is not configured.
 *
 * It is a real implementation of the same contract — sessions, join codes,
 * responses and analysis all behave exactly as they do against Postgres —
 * but it lives in the server process, so data resets when the server
 * restarts. This is what makes "demo mode" a complete application rather
 * than a set of screenshots.
 */
interface DemoData {
  profiles: Map<string, Profile>;
  sessions: Map<string, ClassSession>;
  participants: Map<string, Participant>;
  questions: Map<string, Question>;
  responses: Map<string, Response>;
  confusionMaps: ConfusionMap[];
  diagnoses: Map<string, Diagnosis>;
  practice: PracticeAttempt[];
  teachBacks: TeachBack[];
  mastery: Map<string, MasteryRecord>;
  revision: number;
}

// Survives Next.js dev hot-reloads.
const globalForDemo = globalThis as unknown as { __thinktraceDemo?: DemoData };

function data(): DemoData {
  if (!globalForDemo.__thinktraceDemo) {
    globalForDemo.__thinktraceDemo = {
      profiles: new Map(),
      sessions: new Map(),
      participants: new Map(),
      questions: new Map(),
      responses: new Map(),
      confusionMaps: [],
      diagnoses: new Map(),
      practice: [],
      teachBacks: [],
      mastery: new Map(),
      revision: 0,
    };
  }
  return globalForDemo.__thinktraceDemo;
}

function bump() {
  data().revision += 1;
}

const now = () => new Date().toISOString();

export class DemoStore implements Store {
  readonly mode = "demo" as const;

  /* profiles */
  async getProfile(id: string) {
    return data().profiles.get(id) ?? null;
  }

  async upsertProfile(profile: Profile) {
    data().profiles.set(profile.id, profile);
    return profile;
  }

  async findProfileByEmail(email: string) {
    const target = email.toLowerCase().trim();
    return (
      [...data().profiles.values()].find(
        (p) => p.email.toLowerCase() === target,
      ) ?? null
    );
  }

  async createDemoProfile(input: {
    email: string;
    fullName: string;
    role: Role;
  }) {
    const existing = await this.findProfileByEmail(input.email);
    if (existing) {
      // Let a returning demo user switch role without creating a duplicate.
      const updated = { ...existing, ...input };
      data().profiles.set(existing.id, updated);
      return updated;
    }
    const profile: Profile = { id: newId("usr"), ...input };
    data().profiles.set(profile.id, profile);
    return profile;
  }

  /* sessions */
  async createSession(input: CreateSessionInput) {
    let joinCode = generateJoinCode();
    const taken = new Set(
      [...data().sessions.values()].map((s) => s.joinCode),
    );
    while (taken.has(joinCode)) joinCode = generateJoinCode();

    const session: ClassSession = {
      id: newId("ses"),
      teacherId: input.teacherId,
      title: input.title,
      topic: input.topic,
      joinCode,
      status: "lobby",
      createdAt: now(),
    };
    data().sessions.set(session.id, session);
    bump();
    return session;
  }

  async getSession(id: string) {
    return data().sessions.get(id) ?? null;
  }

  async getSessionByCode(code: string) {
    const target = code.toUpperCase().trim();
    return (
      [...data().sessions.values()].find((s) => s.joinCode === target) ?? null
    );
  }

  async listSessionsForTeacher(teacherId: string) {
    return [...data().sessions.values()]
      .filter((s) => s.teacherId === teacherId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listSessionsForParticipantUser(userId: string) {
    const sessionIds = new Set(
      [...data().participants.values()]
        .filter((p) => p.userId === userId)
        .map((p) => p.sessionId),
    );
    return [...data().sessions.values()]
      .filter((s) => sessionIds.has(s.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async setSessionStatus(id: string, status: SessionStatus) {
    const session = data().sessions.get(id);
    if (!session) return null;
    const updated = { ...session, status };
    data().sessions.set(id, updated);
    bump();
    return updated;
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
    const participant: Participant = {
      id: newId("par"),
      sessionId: input.sessionId,
      userId: input.userId,
      displayName: input.displayName,
      isAnonymous: input.isAnonymous,
      joinedAt: now(),
    };
    data().participants.set(participant.id, participant);
    bump();
    return participant;
  }

  async listParticipants(sessionId: string) {
    return [...data().participants.values()]
      .filter((p) => p.sessionId === sessionId)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  }

  async getParticipant(id: string) {
    return data().participants.get(id) ?? null;
  }

  async findParticipantByUser(sessionId: string, userId: string) {
    return (
      [...data().participants.values()].find(
        (p) => p.sessionId === sessionId && p.userId === userId,
      ) ?? null
    );
  }

  async attachParticipantUser(participantId: string, userId: string) {
    const participant = data().participants.get(participantId);
    if (!participant) return null;
    const updated = { ...participant, userId };
    data().participants.set(participantId, updated);
    bump();
    return updated;
  }

  /* questions */
  async createQuestion(input: CreateQuestionInput) {
    const question: Question = {
      id: newId("qst"),
      sessionId: input.sessionId,
      prompt: input.prompt,
      type: input.type,
      options: input.options,
      correctOptionId: input.correctOptionId,
      concept: input.concept,
      status: "draft",
      allowAnonymous: input.allowAnonymous,
      createdAt: now(),
      publishedAt: null,
    };
    data().questions.set(question.id, question);
    bump();
    return question;
  }

  async listQuestions(sessionId: string) {
    return [...data().questions.values()]
      .filter((q) => q.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getQuestion(id: string) {
    return data().questions.get(id) ?? null;
  }

  async setQuestionStatus(id: string, status: QuestionStatus) {
    const question = data().questions.get(id);
    if (!question) return null;
    const updated: Question = {
      ...question,
      status,
      publishedAt:
        status === "published" && !question.publishedAt
          ? now()
          : question.publishedAt,
    };
    data().questions.set(id, updated);
    bump();
    return updated;
  }

  /* responses */
  async createResponse(input: CreateResponseInput) {
    const question = data().questions.get(input.questionId);
    const isCorrect =
      question?.correctOptionId != null && input.selectedOptionId != null
        ? input.selectedOptionId === question.correctOptionId
        : null;

    const existing = await this.findResponse(
      input.questionId,
      input.participantId,
    );

    const response: Response = {
      id: existing?.id ?? newId("res"),
      questionId: input.questionId,
      sessionId: input.sessionId,
      participantId: input.participantId,
      selectedOptionId: input.selectedOptionId,
      answerText: input.answerText,
      reasoning: input.reasoning,
      isCorrect,
      createdAt: existing?.createdAt ?? now(),
    };
    data().responses.set(response.id, response);
    bump();
    return response;
  }

  async listResponsesForSession(sessionId: string) {
    return [...data().responses.values()]
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listResponsesForQuestion(questionId: string) {
    return [...data().responses.values()]
      .filter((r) => r.questionId === questionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getResponse(id: string) {
    return data().responses.get(id) ?? null;
  }

  async findResponse(questionId: string, participantId: string) {
    return (
      [...data().responses.values()].find(
        (r) => r.questionId === questionId && r.participantId === participantId,
      ) ?? null
    );
  }

  /* analysis artefacts */
  async saveConfusionMap(map: ConfusionMap) {
    const store = data();
    store.confusionMaps = store.confusionMaps.filter(
      (m) => m.questionId !== map.questionId,
    );
    store.confusionMaps.push(map);
    bump();
    return map;
  }

  async listConfusionMaps(sessionId: string) {
    return data().confusionMaps.filter(
      (m) => data().questions.get(m.questionId)?.sessionId === sessionId,
    );
  }

  async saveDiagnosis(diagnosis: Diagnosis) {
    data().diagnoses.set(diagnosis.id, diagnosis);
    bump();
    return diagnosis;
  }

  async getDiagnosis(id: string) {
    return data().diagnoses.get(id) ?? null;
  }

  async findDiagnosisByResponse(responseId: string) {
    return (
      [...data().diagnoses.values()].find((d) => d.responseId === responseId) ??
      null
    );
  }

  async listDiagnosesForParticipant(participantId: string) {
    return [...data().diagnoses.values()]
      .filter((d) => d.participantId === participantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateDiagnosis(id: string, patch: Partial<Diagnosis>) {
    const existing = data().diagnoses.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id: existing.id };
    data().diagnoses.set(id, updated);
    bump();
    return updated;
  }

  async savePracticeAttempt(attempt: PracticeAttempt) {
    const store = data();
    store.practice = store.practice.filter(
      (a) =>
        !(
          a.diagnosisId === attempt.diagnosisId &&
          a.questionId === attempt.questionId
        ),
    );
    store.practice.push(attempt);
    bump();
    return attempt;
  }

  async listPracticeAttempts(diagnosisId: string) {
    return data().practice.filter((a) => a.diagnosisId === diagnosisId);
  }

  async saveTeachBack(teachBack: TeachBack) {
    data().teachBacks.push(teachBack);
    bump();
    return teachBack;
  }

  async listTeachBacks(diagnosisId: string) {
    return data()
      .teachBacks.filter((t) => t.diagnosisId === diagnosisId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async upsertMastery(input: MasteryInput) {
    const key = `${input.participantId}:${input.concept}`;
    const record: MasteryRecord = {
      id: key,
      sessionId: input.sessionId,
      participantId: input.participantId,
      displayName: input.displayName,
      concept: input.concept,
      state: input.state,
      stage: input.stage,
      updatedAt: now(),
    };
    data().mastery.set(key, record);
    bump();
    return record;
  }

  async listMastery(sessionId: string) {
    return [...data().mastery.values()].filter(
      (m) => m.sessionId === sessionId,
    );
  }

  async listMasteryForParticipant(participantId: string) {
    return [...data().mastery.values()].filter(
      (m) => m.participantId === participantId,
    );
  }

  /* live */
  async getSnapshot(sessionId: string): Promise<LiveSnapshot | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    return {
      session,
      participants: await this.listParticipants(sessionId),
      questions: await this.listQuestions(sessionId),
      responses: await this.listResponsesForSession(sessionId),
      confusionMaps: await this.listConfusionMaps(sessionId),
      mastery: await this.listMastery(sessionId),
      revision: data().revision,
    };
  }
}

/** Exposed so the seeding route can reset demo data cleanly. */
export function resetDemoData() {
  globalForDemo.__thinktraceDemo = undefined;
}
