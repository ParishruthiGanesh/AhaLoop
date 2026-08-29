/**
 * Core domain model for ThinkTrace AI.
 *
 * These types are shared by the Supabase adapter, the in-memory demo adapter,
 * the AI layer and the UI, so that "demo mode" and "real mode" are genuinely
 * the same application with a different backend.
 */

export type Role = "teacher" | "student";

export type SessionStatus = "lobby" | "live" | "ended";
export type QuestionType = "mcq" | "open";
export type QuestionStatus = "draft" | "published" | "closed";

/**
 * Mastery ladder used across ErrorTwin practice and teach-back.
 * red    - the misconception is still driving the reasoning
 * yellow - correct answer, but the reasoning is uncertain
 * green  - understands the concept and can transfer it
 * blue   - can explain it to someone else
 */
export type MasteryState = "red" | "yellow" | "green" | "blue";

export const MASTERY_ORDER: MasteryState[] = ["red", "yellow", "green", "blue"];

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface ClassSession {
  id: string;
  teacherId: string;
  title: string;
  topic: string;
  joinCode: string;
  status: SessionStatus;
  createdAt: string;
}

export interface Participant {
  id: string;
  sessionId: string;
  userId: string | null;
  displayName: string;
  isAnonymous: boolean;
  joinedAt: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  sessionId: string;
  prompt: string;
  type: QuestionType;
  /** Present for `mcq` questions. */
  options: QuestionOption[];
  /** Option id of the correct answer, for `mcq`. */
  correctOptionId: string | null;
  /** The concept under test, e.g. "classification metrics under class imbalance". */
  concept: string;
  status: QuestionStatus;
  allowAnonymous: boolean;
  createdAt: string;
  publishedAt: string | null;
}

export interface Response {
  id: string;
  questionId: string;
  sessionId: string;
  participantId: string;
  /** Selected option id for `mcq`. */
  selectedOptionId: string | null;
  /** The student's answer for `open` questions. */
  answerText: string | null;
  /** "Why did you answer that?" — this is what ConceptLens actually diagnoses. */
  reasoning: string;
  isCorrect: boolean | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* AI structured outputs                                               */
/* ------------------------------------------------------------------ */

export interface ConfusionGroup {
  /** Short label, e.g. "Definition misunderstood". */
  label: string;
  /** What the AI believes these students think. */
  interpretation: string;
  /** Participant ids in this group (empty when responses are anonymous). */
  participantIds: string[];
  studentCount: number;
  /** True for the group that already understands. */
  isCorrectGroup: boolean;
}

export interface ConfusionMap {
  questionId: string;
  totalResponses: number;
  groups: ConfusionGroup[];
  topMisconception: string;
  missingPrerequisites: string[];
  /** A two-minute explanation the teacher can give right now. */
  recommendedIntervention: string;
  /** A concrete counterexample to put on the board. */
  counterexample: string;
  suggestedFollowUpQuestion: string;
  /** Participant ids that likely need one-to-one help (empty if anonymous). */
  studentsNeedingHelp: string[];
  generatedBy: AnalysisSource;
  createdAt: string;
}

export interface PrerequisiteNode {
  id: string;
  concept: string;
  /** Why this concept is the blocker. */
  why: string;
  /** One-minute explanation shown when the student opens the node. */
  explanation: string;
  /** A worked, concrete example. */
  example: string;
  /** A single check-for-understanding question. */
  checkQuestion: string;
  checkAnswer: string;
}

export interface ErrorTwinQuestion {
  id: string;
  /** Escalating: similar -> new context -> boundary case -> explain -> transfer. */
  kind: "similar" | "new-context" | "boundary" | "explain" | "transfer";
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  /** Why the tempting wrong option is tempting — used when the student trips. */
  trapExplanation: string;
}

export interface ErrorTwin {
  /** The reasoning pattern, not the specific question. */
  pattern: string;
  description: string;
  questions: ErrorTwinQuestion[];
}

export interface Diagnosis {
  id: string;
  responseId: string | null;
  participantId: string;
  sessionId: string | null;
  concept: string;
  /** The student's own words that were diagnosed. */
  studentReasoning: string;
  misconception: string;
  whyReasoningFails: string;
  counterexample: string;
  missingPrerequisites: string[];
  /** 0..1 */
  confidence: number;
  repairPath: PrerequisiteNode[];
  errorTwin: ErrorTwin;
  /** Student's own confirmation of the diagnosis. */
  studentFeedback: "confirmed" | "rejected" | "unsure" | null;
  masteryState: MasteryState;
  generatedBy: AnalysisSource;
  createdAt: string;
}

export type ExplanationStyle =
  | "simple"
  | "technical"
  | "step-by-step"
  | "visual"
  | "analogy";

export interface ExplanationRequest {
  concept: string;
  misconception: string;
  style: ExplanationStyle;
  /** Free-form language name, e.g. "Telugu". "English" is the default. */
  language: string;
  /** Keep technical terms in English while translating the prose. */
  keepTechnicalTermsInEnglish: boolean;
}

export interface Explanation {
  style: ExplanationStyle;
  language: string;
  title: string;
  /** Paragraphs (simple/technical/analogy) or ordered steps (step-by-step). */
  body: string[];
  /** Low-text visual mode: short labelled blocks the UI renders as a diagram. */
  visual: { label: string; detail: string }[];
  keyTerms: { term: string; meaning: string }[];
  generatedBy: AnalysisSource;
}

export interface Perspective {
  id: string;
  persona: string;
  domain: string;
  /** Emoji used as the card glyph. */
  glyph: string;
  headline: string;
  body: string;
  /** A curated, relevance-checked resource for the prototype. */
  resource?: { title: string; url: string; kind: "video" | "article" };
}

export interface PerspectiveSet {
  concept: string;
  perspectives: Perspective[];
  generatedBy: AnalysisSource;
}

export interface PracticeAttempt {
  id: string;
  diagnosisId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  /** True when the student picked the option built from their own misconception. */
  repeatedMisconception: boolean;
  createdAt: string;
}

export interface TeachBackEvaluation {
  /** The headline: has the original misconception actually gone? */
  resolved: boolean;
  misconceptionStillPresent: boolean;
  conceptsCovered: string[];
  conceptsMissing: string[];
  /** Memorised phrasing vs. genuine application. */
  appearsMemorised: boolean;
  canTransfer: boolean;
  masteryState: MasteryState;
  score: number;
  feedback: string;
  nextStep: string;
  generatedBy: AnalysisSource;
}

export interface TeachBack {
  id: string;
  diagnosisId: string;
  participantId: string;
  prompt: string;
  text: string;
  evaluation: TeachBackEvaluation;
  createdAt: string;
}

export interface MasteryRecord {
  id: string;
  sessionId: string | null;
  participantId: string;
  displayName: string;
  concept: string;
  state: MasteryState;
  /** Where the student is in the cycle, for the teacher dashboard. */
  stage: CycleStage;
  updatedAt: string;
}

export type CycleStage =
  | "answered"
  | "diagnosed"
  | "repairing"
  | "practising"
  | "teach-back"
  | "resolved";

export const CYCLE_STAGES: CycleStage[] = [
  "answered",
  "diagnosed",
  "repairing",
  "practising",
  "teach-back",
  "resolved",
];

/** Whether a piece of analysis came from a live model or the demo analyzer. */
export type AnalysisSource = "llm" | "demo";

/** Snapshot returned by the live polling endpoint. */
export interface LiveSnapshot {
  session: ClassSession;
  participants: Participant[];
  questions: Question[];
  responses: Response[];
  confusionMaps: ConfusionMap[];
  mastery: MasteryRecord[];
  /** Monotonic revision — clients skip re-render when unchanged. */
  revision: number;
}
