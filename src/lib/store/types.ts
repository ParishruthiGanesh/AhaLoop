import type {
  ClassSession,
  ConfusionMap,
  Diagnosis,
  LiveSnapshot,
  MasteryRecord,
  MasteryState,
  Participant,
  PracticeAttempt,
  Profile,
  Question,
  QuestionStatus,
  Response,
  Role,
  SessionStatus,
  TeachBack,
  CycleStage,
} from "../types";

export interface CreateSessionInput {
  teacherId: string;
  title: string;
  topic: string;
}

export interface CreateQuestionInput {
  sessionId: string;
  prompt: string;
  type: "mcq" | "open";
  options: { id: string; text: string }[];
  correctOptionId: string | null;
  concept: string;
  allowAnonymous: boolean;
}

export interface CreateResponseInput {
  questionId: string;
  sessionId: string;
  participantId: string;
  selectedOptionId: string | null;
  answerText: string | null;
  reasoning: string;
}

export interface JoinInput {
  sessionId: string;
  userId: string | null;
  displayName: string;
  isAnonymous: boolean;
}

export interface MasteryInput {
  sessionId: string | null;
  participantId: string;
  displayName: string;
  concept: string;
  state: MasteryState;
  stage: CycleStage;
}

/**
 * The storage contract. Both the in-memory demo store and the Supabase store
 * implement it, so every route and component is backend-agnostic.
 */
export interface Store {
  readonly mode: "demo" | "supabase";

  /* profiles */
  getProfile(id: string): Promise<Profile | null>;
  upsertProfile(profile: Profile): Promise<Profile>;
  findProfileByEmail(email: string): Promise<Profile | null>;
  createDemoProfile(input: {
    email: string;
    fullName: string;
    role: Role;
  }): Promise<Profile>;

  /* sessions */
  createSession(input: CreateSessionInput): Promise<ClassSession>;
  getSession(id: string): Promise<ClassSession | null>;
  getSessionByCode(code: string): Promise<ClassSession | null>;
  listSessionsForTeacher(teacherId: string): Promise<ClassSession[]>;
  listSessionsForParticipantUser(userId: string): Promise<ClassSession[]>;
  setSessionStatus(id: string, status: SessionStatus): Promise<ClassSession | null>;

  /* participants */
  joinSession(input: JoinInput): Promise<Participant>;
  listParticipants(sessionId: string): Promise<Participant[]>;
  getParticipant(id: string): Promise<Participant | null>;
  findParticipantByUser(
    sessionId: string,
    userId: string,
  ): Promise<Participant | null>;
  /**
   * Binds an existing (seeded, user-less) participant row to an account, so a
   * demo visitor inherits the answer that participant already gave instead of
   * creating a duplicate row.
   */
  attachParticipantUser(
    participantId: string,
    userId: string,
  ): Promise<Participant | null>;

  /* questions */
  createQuestion(input: CreateQuestionInput): Promise<Question>;
  listQuestions(sessionId: string): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | null>;
  setQuestionStatus(
    id: string,
    status: QuestionStatus,
  ): Promise<Question | null>;

  /* responses */
  createResponse(input: CreateResponseInput): Promise<Response>;
  listResponsesForSession(sessionId: string): Promise<Response[]>;
  listResponsesForQuestion(questionId: string): Promise<Response[]>;
  getResponse(id: string): Promise<Response | null>;
  findResponse(
    questionId: string,
    participantId: string,
  ): Promise<Response | null>;

  /* analysis artefacts */
  saveConfusionMap(map: ConfusionMap): Promise<ConfusionMap>;
  listConfusionMaps(sessionId: string): Promise<ConfusionMap[]>;

  saveDiagnosis(diagnosis: Diagnosis): Promise<Diagnosis>;
  getDiagnosis(id: string): Promise<Diagnosis | null>;
  findDiagnosisByResponse(responseId: string): Promise<Diagnosis | null>;
  listDiagnosesForParticipant(participantId: string): Promise<Diagnosis[]>;
  updateDiagnosis(
    id: string,
    patch: Partial<Diagnosis>,
  ): Promise<Diagnosis | null>;

  savePracticeAttempt(attempt: PracticeAttempt): Promise<PracticeAttempt>;
  listPracticeAttempts(diagnosisId: string): Promise<PracticeAttempt[]>;

  saveTeachBack(teachBack: TeachBack): Promise<TeachBack>;
  listTeachBacks(diagnosisId: string): Promise<TeachBack[]>;

  upsertMastery(input: MasteryInput): Promise<MasteryRecord>;
  listMastery(sessionId: string): Promise<MasteryRecord[]>;
  listMasteryForParticipant(participantId: string): Promise<MasteryRecord[]>;

  /* live */
  getSnapshot(sessionId: string): Promise<LiveSnapshot | null>;
}

/** Six unambiguous characters — no O/0/I/1. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
