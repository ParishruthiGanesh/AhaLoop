import "server-only";

import {
  buildConfusionMap,
  buildDiagnosis,
  buildExplanation,
  buildPerspectives,
  buildRepairPath,
  evaluateTeachBack,
  DEMO_TRANSLATIONS,
} from "./demo-analyzer";
import { generateStructured, type JsonSchema } from "./llm";
import { buildErrorTwin } from "./demo-analyzer";
import { MISCONCEPTIONS } from "../lesson";
import type {
  ConfusionMap,
  ErrorTwin,
  Explanation,
  ExplanationRequest,
  MasteryState,
  Participant,
  PerspectiveSet,
  PrerequisiteNode,
  Question,
  Response,
  TeachBackEvaluation,
} from "../types";

/**
 * The analysis layer.
 *
 * Every entry point has the same shape: ask the model for a structured
 * object, validate it, and fall back to the deterministic demo analyzer if
 * anything is missing. Callers therefore always receive a complete result,
 * tagged with whether a live model or the demo analyzer produced it.
 */

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

const TEACHING_SYSTEM = `You are the analysis engine inside ThinkTrace AI, a classroom diagnostic platform.
You diagnose the *reasoning* behind a student's answer, not just its correctness.
Rules:
- Name the specific belief that produced the answer, in one sentence, in the student's own frame of reference.
- Explain why that belief fails using a concrete numeric counterexample, never an abstract restatement.
- Prefer the smallest missing prerequisite over "revise the chapter".
- Be precise and respectful. Never condescend, never pad, never use exclamation marks.
- Return only the structured object requested.`;

/* ------------------------------------------------------------------ */
/* LecturePulse                                                        */
/* ------------------------------------------------------------------ */

const CONFUSION_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          interpretation: { type: "string" },
          responseIndexes: { type: "array", items: { type: "number" } },
          isCorrectGroup: { type: "boolean" },
        },
        required: ["label", "interpretation", "responseIndexes", "isCorrectGroup"],
      },
    },
    topMisconception: { type: "string" },
    missingPrerequisites: { type: "array", items: { type: "string" } },
    recommendedIntervention: { type: "string" },
    counterexample: { type: "string" },
    suggestedFollowUpQuestion: { type: "string" },
  },
  required: [
    "groups",
    "topMisconception",
    "missingPrerequisites",
    "recommendedIntervention",
    "counterexample",
    "suggestedFollowUpQuestion",
  ],
};

interface RawConfusion {
  groups: {
    label: string;
    interpretation: string;
    responseIndexes: number[];
    isCorrectGroup: boolean;
  }[];
  topMisconception: string;
  missingPrerequisites: string[];
  recommendedIntervention: string;
  counterexample: string;
  suggestedFollowUpQuestion: string;
}

function isRawConfusion(v: unknown): v is RawConfusion {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.groups) &&
    o.groups.length > 0 &&
    o.groups.every((g) => {
      const gg = g as Record<string, unknown>;
      return (
        isStr(gg.label) &&
        isStr(gg.interpretation) &&
        Array.isArray(gg.responseIndexes) &&
        typeof gg.isCorrectGroup === "boolean"
      );
    }) &&
    isStr(o.topMisconception) &&
    isStrArr(o.missingPrerequisites) &&
    isStr(o.recommendedIntervention) &&
    isStr(o.counterexample) &&
    isStr(o.suggestedFollowUpQuestion)
  );
}

export async function analyzeConfusion(
  question: Question,
  responses: Response[],
  participants: Participant[],
): Promise<ConfusionMap> {
  const fallback = buildConfusionMap(question, responses, participants);
  if (responses.length === 0) return fallback;

  const nameFor = (participantId: string) =>
    participants.find((p) => p.id === participantId)?.displayName ?? "Student";

  const transcript = responses
    .map((r, i) => {
      const choice = r.selectedOptionId
        ? question.options.find((o) => o.id === r.selectedOptionId)?.text ??
          r.selectedOptionId
        : (r.answerText ?? "");
      return `[${i}] ${question.allowAnonymous ? "Anonymous" : nameFor(r.participantId)}
  chose: ${choice}
  reasoning: ${r.reasoning || "(none given)"}`;
    })
    .join("\n\n");

  const raw = await generateStructured<RawConfusion>({
    system: TEACHING_SYSTEM,
    schemaName: "confusion_map",
    schema: CONFUSION_SCHEMA,
    validate: isRawConfusion,
    prompt: `Concept under test: ${question.concept}
Question: ${question.prompt}
${
  question.type === "mcq"
    ? `Options:\n${question.options.map((o) => `  (${o.id}) ${o.text}`).join("\n")}\nCorrect option: ${question.correctOptionId}`
    : "This is an open-ended question."
}

Student responses:
${transcript}

Group these students by the *kind* of confusion behind their answer, not by which option they picked. Two students who chose differently but reason identically belong in the same group; two who chose the same option for different reasons do not. Use responseIndexes to assign each response (by its [index]) to exactly one group. Include one group with isCorrectGroup=true for students who genuinely understand.

Then give the teacher: the single most common misconception, the missing prerequisite concepts ranked by how many students need them, a two-minute intervention they can deliver right now, a concrete numeric counterexample to put on the board, and one follow-up question that would separate the confused group from the group that understands.`,
  });

  if (!raw) return fallback;

  const groups = raw.groups.map((g) => {
    const ids = g.responseIndexes
      .filter((i) => Number.isInteger(i) && i >= 0 && i < responses.length)
      .map((i) => responses[i].participantId);
    return {
      label: g.label,
      interpretation: g.interpretation,
      participantIds: question.allowAnonymous ? [] : ids,
      studentCount: ids.length,
      isCorrectGroup: g.isCorrectGroup,
    };
  });

  const assigned = groups.reduce((n, g) => n + g.studentCount, 0);
  // If the model failed to assign most students, the demo grouping is better.
  if (assigned < Math.ceil(responses.length / 2)) return fallback;

  return {
    questionId: question.id,
    totalResponses: responses.length,
    groups: groups.filter((g) => g.studentCount > 0),
    topMisconception: raw.topMisconception,
    missingPrerequisites: raw.missingPrerequisites.slice(0, 5),
    recommendedIntervention: raw.recommendedIntervention,
    counterexample: raw.counterexample,
    suggestedFollowUpQuestion: raw.suggestedFollowUpQuestion,
    studentsNeedingHelp: question.allowAnonymous
      ? []
      : groups.filter((g) => !g.isCorrectGroup).flatMap((g) => g.participantIds),
    generatedBy: "llm",
    createdAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* ConceptLens diagnosis                                               */
/* ------------------------------------------------------------------ */

const DIAGNOSIS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    misconception: { type: "string" },
    whyReasoningFails: { type: "string" },
    counterexample: { type: "string" },
    missingPrerequisites: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    errorPattern: { type: "string" },
    errorPatternDescription: { type: "string" },
  },
  required: [
    "misconception",
    "whyReasoningFails",
    "counterexample",
    "missingPrerequisites",
    "confidence",
    "errorPattern",
    "errorPatternDescription",
  ],
};

interface RawDiagnosis {
  misconception: string;
  whyReasoningFails: string;
  counterexample: string;
  missingPrerequisites: string[];
  confidence: number;
  errorPattern: string;
  errorPatternDescription: string;
}

function isRawDiagnosis(v: unknown): v is RawDiagnosis {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isStr(o.misconception) &&
    isStr(o.whyReasoningFails) &&
    isStr(o.counterexample) &&
    isStrArr(o.missingPrerequisites) &&
    typeof o.confidence === "number" &&
    isStr(o.errorPattern) &&
    isStr(o.errorPatternDescription)
  );
}

export interface DiagnosisResult {
  misconception: string;
  whyReasoningFails: string;
  counterexample: string;
  missingPrerequisites: string[];
  confidence: number;
  repairPath: PrerequisiteNode[];
  errorTwin: ErrorTwin;
  masteryState: MasteryState;
  generatedBy: "llm" | "demo";
}

export async function diagnoseResponse(args: {
  reasoning: string;
  selectedOptionText: string | null;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  correctOptionText: string | null;
  questionPrompt: string;
  concept: string;
}): Promise<DiagnosisResult> {
  const demo = buildDiagnosis({
    reasoning: args.reasoning,
    selectedOptionId: args.selectedOptionId,
    correctOptionId: args.correctOptionId,
    concept: args.concept,
  });

  const raw = await generateStructured<RawDiagnosis>({
    system: TEACHING_SYSTEM,
    schemaName: "misconception_diagnosis",
    schema: DIAGNOSIS_SCHEMA,
    validate: isRawDiagnosis,
    prompt: `Concept: ${args.concept}
Question the student answered: ${args.questionPrompt}
Their answer: ${args.selectedOptionText ?? "(open response)"}
The correct answer: ${args.correctOptionText ?? "(see reasoning)"}
Their reasoning, in their own words: "${args.reasoning}"

Diagnose the belief behind this reasoning.
- misconception: the belief itself, one sentence, stated as the student would state it.
- whyReasoningFails: why that belief breaks, grounded in a specific numeric case.
- counterexample: a short concrete example with real numbers that makes the failure undeniable.
- missingPrerequisites: 1-3 earlier concepts, smallest first. Prefer these exact labels when they apply: "class imbalance", "confusion matrix", "false positives", "false negatives", "true and false predictions", "cost of errors", "evaluation vs. training".
- confidence: 0 to 1, how certain the diagnosis is given how much the student actually wrote.
- errorPattern: the reasoning habit that will reappear on other questions, not this question's mistake.
- errorPatternDescription: one or two sentences addressed to the student as "Your ErrorTwin ...".

If the reasoning is actually correct, say so in misconception and set confidence accordingly.`,
  });

  if (!raw) return { ...demo, generatedBy: "demo" };

  const prerequisites = raw.missingPrerequisites
    .map((p) => p.toLowerCase().trim())
    .slice(0, 4);
  const repairPath = buildRepairPath(prerequisites);

  // ErrorTwin questions come from the vetted bank so practice items are always
  // well-formed; the model chooses which reasoning pattern to target.
  const matched =
    MISCONCEPTIONS.find((m) =>
      raw.misconception.toLowerCase().includes(m.id.split("-")[0]),
    ) ??
    MISCONCEPTIONS.find((m) =>
      prerequisites.some((p) => m.missingPrerequisites.includes(p)),
    ) ??
    null;

  const errorTwin = buildErrorTwin(matched);

  return {
    misconception: raw.misconception,
    whyReasoningFails: raw.whyReasoningFails,
    counterexample: raw.counterexample,
    missingPrerequisites: prerequisites,
    confidence: Math.max(0, Math.min(1, raw.confidence)),
    repairPath: repairPath.length > 0 ? repairPath : demo.repairPath,
    errorTwin: {
      pattern: raw.errorPattern,
      description: raw.errorPatternDescription,
      questions: errorTwin.questions,
    },
    masteryState: demo.masteryState,
    generatedBy: "llm",
  };
}

/* ------------------------------------------------------------------ */
/* Explain My Way                                                      */
/* ------------------------------------------------------------------ */

const EXPLANATION_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    body: { type: "array", items: { type: "string" } },
    visual: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, detail: { type: "string" } },
        required: ["label", "detail"],
      },
    },
    keyTerms: {
      type: "array",
      items: {
        type: "object",
        properties: { term: { type: "string" }, meaning: { type: "string" } },
        required: ["term", "meaning"],
      },
    },
  },
  required: ["title", "body", "visual", "keyTerms"],
};

interface RawExplanation {
  title: string;
  body: string[];
  visual: { label: string; detail: string }[];
  keyTerms: { term: string; meaning: string }[];
}

function isRawExplanation(v: unknown): v is RawExplanation {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isStr(o.title) &&
    isStrArr(o.body) &&
    o.body.length > 0 &&
    Array.isArray(o.visual) &&
    Array.isArray(o.keyTerms)
  );
}

const STYLE_BRIEF: Record<string, string> = {
  simple: "Short sentences, everyday words, no jargon. Aim at a curious 14-year-old.",
  technical:
    "Precise and formal. Use the actual formulas and name the terms exactly.",
  "step-by-step":
    "An ordered procedure. Each body entry is one action the student performs, in order.",
  visual:
    "Minimal text. Body entries are at most eight words each; carry the meaning in the `visual` blocks.",
  analogy:
    "One sustained real-world analogy carried through every paragraph. Do not mix metaphors.",
};

/** Languages the demo analyzer can render without a model. */
export const OFFLINE_LANGUAGES = Object.keys(DEMO_TRANSLATIONS);

export async function explain(
  req: ExplanationRequest,
): Promise<Explanation & { languageUnavailable?: boolean }> {
  const demo = buildExplanation(req);
  const lang = req.language.trim();
  const isEnglish = !lang || lang.toLowerCase() === "english";

  const raw = await generateStructured<RawExplanation>({
    system: TEACHING_SYSTEM,
    schemaName: "explanation",
    schema: EXPLANATION_SCHEMA,
    validate: isRawExplanation,
    prompt: `Concept: ${req.concept}
The student's misconception: ${req.misconception}

Explain the concept so that it directly dismantles that misconception.

Style: ${req.style} — ${STYLE_BRIEF[req.style] ?? ""}
Language: ${isEnglish ? "English" : lang}${
      !isEnglish && req.keepTechnicalTermsInEnglish
        ? `. Write the prose in ${lang} but keep technical terms (accuracy, precision, recall, class imbalance, false negative, model) in English, inline.`
        : ""
    }

- title: a short heading, in the target language.
- body: 3 to 6 entries in the requested style and language.
- visual: 4 to 6 label/detail pairs that carry the argument with almost no prose. The label is a number or a very short phrase.
- keyTerms: 3 to 5 terms with one-line meanings.`,
  });

  if (raw) {
    return {
      style: req.style,
      language: isEnglish ? "English" : lang,
      title: raw.title,
      body: raw.body,
      visual: raw.visual.length > 0 ? raw.visual : demo.visual,
      keyTerms: raw.keyTerms.length > 0 ? raw.keyTerms : demo.keyTerms,
      generatedBy: "llm",
    };
  }

  // No model available. Curated translations cover a few languages; anything
  // else is reported honestly instead of silently returning English.
  const unavailable =
    !isEnglish && !DEMO_TRANSLATIONS[lang.toLowerCase()];

  return { ...demo, languageUnavailable: unavailable };
}

/* ------------------------------------------------------------------ */
/* PerspectiveLab                                                      */
/* ------------------------------------------------------------------ */

const PERSPECTIVE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    perspectives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          persona: { type: "string" },
          domain: { type: "string" },
          glyph: { type: "string" },
          headline: { type: "string" },
          body: { type: "string" },
        },
        required: ["persona", "domain", "glyph", "headline", "body"],
      },
    },
  },
  required: ["perspectives"],
};

interface RawPerspectives {
  perspectives: {
    persona: string;
    domain: string;
    glyph: string;
    headline: string;
    body: string;
  }[];
}

function isRawPerspectives(v: unknown): v is RawPerspectives {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.perspectives) &&
    o.perspectives.length >= 3 &&
    o.perspectives.every((p) => {
      const pp = p as Record<string, unknown>;
      return isStr(pp.persona) && isStr(pp.headline) && isStr(pp.body);
    })
  );
}

export async function perspectives(
  concept: string,
  misconception: string,
): Promise<PerspectiveSet> {
  const demo = buildPerspectives(concept);

  const raw = await generateStructured<RawPerspectives>({
    system: TEACHING_SYSTEM,
    schemaName: "perspective_set",
    schema: PERSPECTIVE_SCHEMA,
    validate: isRawPerspectives,
    prompt: `Concept: ${concept}
The student's misconception: ${misconception}

Give five explanations of the same concept from genuinely different vantage points: a practitioner whose work depends on it, a second practitioner from an unrelated field, an assessment or grading angle, the formal technical account, and an everyday analogy a child would follow.

Each perspective: persona (a job title), domain, glyph (one emoji), headline (one vivid first-person sentence), body (3-5 sentences in that person's voice, addressing the misconception from inside their work). Do not repeat the same example across perspectives.`,
  });

  if (!raw) return demo;

  return {
    concept,
    perspectives: raw.perspectives.slice(0, 6).map((p, i) => ({
      id: `p-${i}`,
      persona: p.persona,
      domain: p.domain,
      glyph: p.glyph || "💡",
      headline: p.headline,
      body: p.body,
      resource: demo.perspectives[i]?.resource,
    })),
    generatedBy: "llm",
  };
}

/* ------------------------------------------------------------------ */
/* Teach-back verification                                             */
/* ------------------------------------------------------------------ */

const TEACHBACK_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    resolved: { type: "boolean" },
    misconceptionStillPresent: { type: "boolean" },
    conceptsCovered: { type: "array", items: { type: "string" } },
    conceptsMissing: { type: "array", items: { type: "string" } },
    appearsMemorised: { type: "boolean" },
    canTransfer: { type: "boolean" },
    score: { type: "number" },
    feedback: { type: "string" },
    nextStep: { type: "string" },
  },
  required: [
    "resolved",
    "misconceptionStillPresent",
    "conceptsCovered",
    "conceptsMissing",
    "appearsMemorised",
    "canTransfer",
    "score",
    "feedback",
    "nextStep",
  ],
};

interface RawTeachBack {
  resolved: boolean;
  misconceptionStillPresent: boolean;
  conceptsCovered: string[];
  conceptsMissing: string[];
  appearsMemorised: boolean;
  canTransfer: boolean;
  score: number;
  feedback: string;
  nextStep: string;
}

function isRawTeachBack(v: unknown): v is RawTeachBack {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.resolved === "boolean" &&
    typeof o.misconceptionStillPresent === "boolean" &&
    isStrArr(o.conceptsCovered) &&
    isStrArr(o.conceptsMissing) &&
    typeof o.appearsMemorised === "boolean" &&
    typeof o.canTransfer === "boolean" &&
    typeof o.score === "number" &&
    isStr(o.feedback) &&
    isStr(o.nextStep)
  );
}

export async function assessTeachBack(args: {
  text: string;
  prompt: string;
  concept: string;
  misconception: string;
}): Promise<TeachBackEvaluation> {
  const demo = evaluateTeachBack(args.text, args.misconception);

  const raw = await generateStructured<RawTeachBack>({
    system: TEACHING_SYSTEM,
    schemaName: "teachback_evaluation",
    schema: TEACHBACK_SCHEMA,
    validate: isRawTeachBack,
    prompt: `Concept: ${args.concept}
The misconception this student started with: ${args.misconception}
They were asked: ${args.prompt}
Their explanation, in their own words: "${args.text}"

Judge whether the original misconception is actually gone.
- misconceptionStillPresent: true if the same faulty belief is still driving the explanation, even if the wording changed.
- conceptsCovered / conceptsMissing: short phrases naming what the explanation does and does not establish.
- appearsMemorised: true if it recites definitions without applying them to a case.
- canTransfer: true only if they apply the idea beyond the original example.
- score: 0-100.
- resolved: true only when the misconception is gone AND the core mechanism is explained.
- feedback: 2-4 sentences addressed to the student, specific about what their words did and did not show. No praise padding.
- nextStep: one concrete action.`,
  });

  if (!raw) return demo;

  let masteryState: MasteryState;
  if (raw.misconceptionStillPresent) masteryState = "red";
  else if (raw.appearsMemorised || !raw.resolved) masteryState = "yellow";
  else if (!raw.canTransfer) masteryState = "green";
  else masteryState = "blue";

  return {
    resolved: raw.resolved,
    misconceptionStillPresent: raw.misconceptionStillPresent,
    conceptsCovered: raw.conceptsCovered,
    conceptsMissing: raw.conceptsMissing,
    appearsMemorised: raw.appearsMemorised,
    canTransfer: raw.canTransfer,
    masteryState,
    score: Math.max(0, Math.min(100, Math.round(raw.score))),
    feedback: raw.feedback,
    nextStep: raw.nextStep,
    generatedBy: "llm",
  };
}
