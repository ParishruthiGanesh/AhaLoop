import {
  CORRECT_GROUP_LABEL,
  CORRECT_SIGNALS,
  isSampleLessonConcept,
  MISCONCEPTIONS,
  PREREQUISITE_GRAPH,
  type MisconceptionProfile,
} from "../lesson";
import { ERROR_TWIN_BANK, GENERIC_BANK } from "../errortwin-bank";
import type {
  ConfusionGroup,
  ConfusionMap,
  ErrorTwin,
  Explanation,
  ExplanationRequest,
  MasteryState,
  Participant,
  Perspective,
  PerspectiveSet,
  PrerequisiteNode,
  Question,
  Response,
  TeachBackEvaluation,
} from "../types";

/**
 * The demo analyzer.
 *
 * It is deterministic and runs entirely on-device, but it is not a lookup
 * table: it reads the student's actual words, matches them against a
 * misconception catalogue and builds the same structured objects the LLM
 * path produces. Everything it returns is tagged `generatedBy: "demo"` so
 * the UI can label it honestly.
 */

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export interface Classification {
  profile: MisconceptionProfile | null;
  confidence: number;
  /** True when the reasoning shows correct understanding. */
  correct: boolean;
  /**
   * True when nothing in the catalogue matched. The demo analyzer only knows
   * the sample lesson, so rather than assigning a confident-looking but wrong
   * misconception, it says it does not know.
   */
  undiagnosed: boolean;
}

/** Score how strongly a piece of reasoning matches a misconception profile. */
function scoreProfile(
  profile: MisconceptionProfile,
  text: string,
  selectedOptionId: string | null,
): number {
  let score = 0;
  for (const signal of profile.signals) {
    if (text.includes(signal)) score += 2;
  }
  if (selectedOptionId && profile.optionIds.includes(selectedOptionId)) {
    score += 3;
  }
  return score;
}

export function classifyReasoning(
  reasoning: string,
  selectedOptionId: string | null,
  correctOptionId: string | null,
): Classification {
  const text = norm(reasoning);

  const correctHits = CORRECT_SIGNALS.filter((s) => text.includes(s)).length;
  const pickedCorrect =
    correctOptionId != null && selectedOptionId === correctOptionId;

  // Genuine understanding: the right option *and* reasoning that names the
  // mechanism. The option alone is only "yellow" territory.
  if (pickedCorrect && correctHits >= 2) {
    return { profile: null, confidence: 0.93, correct: true, undiagnosed: false };
  }

  const ranked = MISCONCEPTIONS.map((profile) => ({
    profile,
    score: scoreProfile(profile, text, selectedOptionId),
  })).sort((a, b) => b.score - a.score);

  const best = ranked[0];

  if (!best || best.score === 0) {
    if (pickedCorrect) {
      // Right answer, thin reasoning — not yet a diagnosed misconception.
      return { profile: null, confidence: 0.55, correct: true, undiagnosed: false };
    }
    // Nothing in the catalogue matched. Say so, rather than inventing a
    // confident-sounding diagnosis from a lesson this student isn't on.
    return { profile: null, confidence: 0.25, correct: false, undiagnosed: true };
  }

  if (pickedCorrect && best.score < 4) {
    return { profile: null, confidence: 0.7, correct: true, undiagnosed: false };
  }

  // Confidence grows with signal strength but is capped, and separation from
  // the runner-up matters: an ambiguous response should not read as certain.
  const runnerUp = ranked[1]?.score ?? 0;
  const separation = Math.min(1, (best.score - runnerUp) / 4);
  const strength = Math.min(1, best.score / 7);
  const confidence =
    best.profile.baseConfidence * (0.6 + 0.25 * strength + 0.15 * separation);

  return {
    profile: best.profile,
    confidence: Math.round(Math.min(0.96, Math.max(0.45, confidence)) * 100) / 100,
    correct: false,
    undiagnosed: false,
  };
}

/* ------------------------------------------------------------------ */
/* LecturePulse — class-level confusion map                            */
/* ------------------------------------------------------------------ */

export function buildConfusionMap(
  question: Question,
  responses: Response[],
  participants: Participant[],
): ConfusionMap {
  const anonymous = question.allowAnonymous;
  const byProfile = new Map<string, { profile: MisconceptionProfile; ids: string[] }>();
  const correctIds: string[] = [];
  const unclassifiedIds: string[] = [];

  for (const response of responses) {
    const { profile, correct, undiagnosed } = classifyReasoning(
      response.reasoning || "",
      response.selectedOptionId,
      question.correctOptionId,
    );
    if (undiagnosed) {
      unclassifiedIds.push(response.participantId);
      continue;
    }
    if (correct || !profile) {
      correctIds.push(response.participantId);
      continue;
    }
    const entry = byProfile.get(profile.id) ?? { profile, ids: [] };
    entry.ids.push(response.participantId);
    byProfile.set(profile.id, entry);
  }

  const groups: ConfusionGroup[] = [...byProfile.values()]
    .sort((a, b) => b.ids.length - a.ids.length)
    .map(({ profile, ids }) => ({
      label: profile.label,
      interpretation: profile.interpretation,
      participantIds: anonymous ? [] : ids,
      studentCount: ids.length,
      isCorrectGroup: false,
    }));

  if (unclassifiedIds.length > 0) {
    groups.push({
      label: "Not classified",
      interpretation:
        "These answers did not match any misconception the demo analyzer knows. Configure a model key to have them read directly.",
      participantIds: anonymous ? [] : unclassifiedIds,
      studentCount: unclassifiedIds.length,
      isCorrectGroup: false,
    });
  }

  if (correctIds.length > 0) {
    groups.push({
      label: CORRECT_GROUP_LABEL,
      interpretation: "Ready for the next concept.",
      participantIds: anonymous ? [] : correctIds,
      studentCount: correctIds.length,
      isCorrectGroup: true,
    });
  }

  const dominant = [...byProfile.values()].sort(
    (a, b) => b.ids.length - a.ids.length,
  )[0];

  const prerequisiteCounts = new Map<string, number>();
  for (const { profile, ids } of byProfile.values()) {
    for (const prereq of profile.missingPrerequisites) {
      prerequisiteCounts.set(
        prereq,
        (prerequisiteCounts.get(prereq) ?? 0) + ids.length,
      );
    }
  }
  const missingPrerequisites = [...prerequisiteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([concept]) => concept)
    .slice(0, 4);

  const confusedCount = responses.length - correctIds.length;

  const studentsNeedingHelp = anonymous
    ? []
    : [...byProfile.values()]
        .flatMap(({ ids }) => ids)
        .filter((id) => participants.some((p) => p.id === id));

  return {
    questionId: question.id,
    totalResponses: responses.length,
    groups,
    topMisconception: dominant
      ? dominant.profile.misconception
      : responses.length > 0
        ? "No dominant misconception — the class is largely with you."
        : "No responses yet.",
    missingPrerequisites,
    recommendedIntervention: dominant
      ? buildIntervention(dominant.profile, confusedCount, responses.length)
      : "Move on, but ask one transfer question to confirm the understanding holds outside this example.",
    counterexample: dominant
      ? dominant.profile.counterexample
      : "Ask the class what a model that always predicts the majority class would score on this dataset.",
    suggestedFollowUpQuestion: dominant
      ? buildFollowUp(dominant.profile)
      : "A model reports 99.9% accuracy detecting a disease affecting 1 in 1,000 people. What is its likely recall?",
    studentsNeedingHelp,
    generatedBy: "demo",
    createdAt: new Date().toISOString(),
  };
}

function buildIntervention(
  profile: MisconceptionProfile,
  confused: number,
  total: number,
): string {
  const share = total > 0 ? Math.round((confused / total) * 100) : 0;
  const openers: Record<string, string> = {
    "accuracy-is-quality":
      "Spend two minutes on the majority-class baseline before you touch precision or recall. Put 10,000 transactions and 100 frauds on the board, then ask the class to score the model that always answers \"not fraud\". When they land on 99%, ask what that model is actually worth. The point to make explicit: accuracy is a weighted average dominated by the common class, so under imbalance it measures the wrong thing rather than measuring it badly.",
    "precision-recall-swap":
      "Do not re-derive the formulas — write the two questions side by side instead. \"Of what we flagged, how much was real?\" (precision) and \"Of what was real, how much did we flag?\" (recall). Then give one worked case where the two numbers diverge sharply, so the denominators become memorable rather than the symbols.",
    "metric-formula-only":
      "This group can compute; they cannot choose. Run a two-minute comparison: fraud detection versus a spam filter that auto-deletes. Same maths, opposite answer. Force the class to name the expensive error out loud first, and only then say which metric follows.",
    "algorithm-attribution":
      "Show that three different algorithms all score ~99% accuracy on the same 1%-fraud data with near-zero recall. That single slide separates evaluation from training: the metric is what is failing, so swapping the model cannot repair it.",
  };
  const body =
    openers[profile.id] ??
    `Address the belief that ${profile.misconception.toLowerCase()} with one concrete counterexample before moving on.`;
  return `${share}% of responding students are reasoning from this misconception. ${body}`;
}

function buildFollowUp(profile: MisconceptionProfile): string {
  const followUps: Record<string, string> = {
    "accuracy-is-quality":
      "A disease affects 1 in 1,000 people. A screening model reports 99.9% accuracy. What is the highest recall it could plausibly have, and how would you check?",
    "precision-recall-swap":
      "A model flags 8 transactions and all 8 are fraud, out of 100 real frauds. Give both precision and recall, and say which one the bank should care about.",
    "metric-formula-only":
      "An email client deletes spam permanently with no spam folder. Which metric leads, and what changed compared with fraud detection?",
    "algorithm-attribution":
      "Two teams with completely different architectures both report 96% accuracy on the same rare-event dataset. What is the most likely explanation?",
  };
  return (
    followUps[profile.id] ??
    "Give the class the same problem in a new domain and ask which metric they would report."
  );
}

/* ------------------------------------------------------------------ */
/* Prerequisite Detective                                              */
/* ------------------------------------------------------------------ */

/**
 * Walks the prerequisite graph backwards from the missing concepts and
 * returns the shortest repair path — deepest prerequisite first, so the
 * student rebuilds from the foundation rather than repeating the chapter.
 */
export function buildRepairPath(missing: string[]): PrerequisiteNode[] {
  const depth = new Map<string, number>();

  const visit = (key: string, seen: Set<string>): number => {
    if (depth.has(key)) return depth.get(key)!;
    if (seen.has(key)) return 0;
    seen.add(key);
    const node = PREREQUISITE_GRAPH[key];
    if (!node) return 0;
    const d =
      node.dependsOn.length === 0
        ? 0
        : 1 + Math.max(...node.dependsOn.map((dep) => visit(dep, seen)));
    depth.set(key, d);
    return d;
  };

  const collected = new Set<string>();
  const expand = (key: string) => {
    if (collected.has(key) || !PREREQUISITE_GRAPH[key]) return;
    collected.add(key);
    for (const dep of PREREQUISITE_GRAPH[key].dependsOn) expand(dep);
  };
  for (const key of missing) expand(key);

  return [...collected]
    .sort((a, b) => visit(a, new Set()) - visit(b, new Set()))
    .slice(0, 3)
    .map((key) => {
      const node = PREREQUISITE_GRAPH[key];
      return {
        id: key.replace(/\s+/g, "-"),
        concept: node.concept,
        why: node.why,
        explanation: node.explanation,
        example: node.example,
        checkQuestion: node.checkQuestion,
        checkAnswer: node.checkAnswer,
      };
    });
}

/* ------------------------------------------------------------------ */
/* ErrorTwin                                                           */
/* ------------------------------------------------------------------ */

export function buildErrorTwin(profile: MisconceptionProfile | null): ErrorTwin {
  const bank = profile ? (ERROR_TWIN_BANK[profile.id] ?? GENERIC_BANK) : GENERIC_BANK;
  return {
    pattern: profile?.errorPattern ?? "Trusting a single headline metric",
    description:
      profile?.errorPatternDescription ??
      "Your ErrorTwin accepts a summary number without asking which errors that number can see.",
    // Three targeted questions: a near-identical case, the same trap moved to
    // a new domain, and a transfer question. Enough to prove the pattern is
    // gone rather than that one answer was memorised.
    questions: pickThree(bank),
  };
}

function pickThree<T extends { kind: string }>(bank: T[]): T[] {
  const preferred = ["similar", "new-context", "transfer"];
  const chosen: T[] = [];
  for (const kind of preferred) {
    const found = bank.find((q) => q.kind === kind && !chosen.includes(q));
    if (found) chosen.push(found);
  }
  for (const q of bank) {
    if (chosen.length >= 3) break;
    if (!chosen.includes(q)) chosen.push(q);
  }
  return chosen.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* ConceptLens diagnosis                                               */
/* ------------------------------------------------------------------ */

export function buildDiagnosis(args: {
  reasoning: string;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  concept: string;
}): {
  misconception: string;
  whyReasoningFails: string;
  counterexample: string;
  missingPrerequisites: string[];
  confidence: number;
  repairPath: PrerequisiteNode[];
  errorTwin: ErrorTwin;
  masteryState: MasteryState;
} {
  const { profile, confidence, correct, undiagnosed } = classifyReasoning(
    args.reasoning,
    args.selectedOptionId,
    args.correctOptionId,
  );

  if (undiagnosed) {
    return {
      misconception:
        "No confident diagnosis — this reasoning is outside what the demo analyzer knows.",
      whyReasoningFails: `Without a language-model key, ThinkTrace diagnoses reasoning against a built-in catalogue for one lesson: accuracy, precision, recall and class imbalance. Your answer about ${args.concept.toLowerCase()} does not match anything in it, and inventing a misconception here would be worse than admitting the gap. Set ANTHROPIC_API_KEY or OPENAI_API_KEY and re-run this diagnosis to have your actual words read.`,
      counterexample:
        "The general habit worth checking either way: before trusting any summary number, ask what a trivial baseline would score on the same data.",
      missingPrerequisites: [],
      confidence,
      repairPath: [],
      errorTwin: buildErrorTwin(null),
      masteryState: "yellow",
    };
  }

  if (correct || !profile) {
    return {
      misconception:
        "No blocking misconception detected — your reasoning names the mechanism, not just the answer.",
      whyReasoningFails:
        "Your explanation connects the score to the class distribution, which is the step most answers skip. The remaining risk is transfer: the same trap looks different outside fraud detection.",
      counterexample:
        "Check yourself on this one: a search engine returns 10 results and 9 are relevant, out of 400 relevant pages. Which metric is 90%?",
      missingPrerequisites: [],
      confidence: Math.round(confidence * 100) / 100,
      repairPath: [],
      errorTwin: buildErrorTwin(null),
      masteryState: confidence > 0.85 ? "green" : "yellow",
    };
  }

  return {
    misconception: profile.misconception,
    whyReasoningFails: profile.whyReasoningFails,
    counterexample: profile.counterexample,
    missingPrerequisites: profile.missingPrerequisites,
    confidence,
    repairPath: buildRepairPath(profile.missingPrerequisites),
    errorTwin: buildErrorTwin(profile),
    masteryState: "red",
  };
}

/* ------------------------------------------------------------------ */
/* Explain My Way                                                      */
/* ------------------------------------------------------------------ */

/**
 * Curated translations for the prototype. With an LLM key configured the
 * server translates live into any language; without one, these four are
 * available and every other language is clearly reported as unavailable
 * rather than silently returning English.
 */
export const DEMO_TRANSLATIONS: Record<string, string[]> = {
  telugu: [
    "1% మాత్రమే fraud ఉన్న డేటాలో, ప్రతి లావాదేవీని \"fraud కాదు\" అని చెప్పే model కూడా 99% accuracy సాధిస్తుంది.",
    "అందుకే 95% accuracy అనే సంఖ్య ఆ model మంచిదని రుజువు చేయదు — అది కనీస స్థాయి కంటే తక్కువ.",
    "అసలు ప్రశ్న: నిజమైన fraud లలో model ఎన్నింటిని పట్టుకుంది? దీన్ని recall కొలుస్తుంది.",
    "కాబట్టి ముందు class imbalance చూడండి, ఆ తరువాత metric ఎంచుకోండి.",
  ],
  hindi: [
    "जिस डेटा में केवल 1% fraud है, वहाँ हर लेन-देन को \"fraud नहीं\" कहने वाला model भी 99% accuracy पा लेता है।",
    "इसलिए 95% accuracy यह साबित नहीं करती कि model अच्छा है — यह तो baseline से भी कम है।",
    "असली सवाल यह है: कुल असली fraud में से model ने कितने पकड़े? इसे recall मापता है।",
    "पहले class imbalance देखें, फिर metric चुनें।",
  ],
  spanish: [
    "En un conjunto de datos donde solo el 1% son fraudes, un model que responde \"no es fraude\" a todo ya alcanza un 99% de accuracy.",
    "Por eso un 95% de accuracy no demuestra que el modelo sea bueno: está por debajo de esa línea base.",
    "La pregunta real es: de todos los fraudes reales, ¿cuántos detectó el modelo? Eso lo mide el recall.",
    "Primero comprueba el class imbalance y después elige la métrica.",
  ],
  french: [
    "Dans un jeu de données où seulement 1 % des transactions sont frauduleuses, un model qui répond « pas de fraude » à chaque fois atteint déjà 99 % d'accuracy.",
    "Un score de 95 % d'accuracy ne prouve donc pas que le modèle est bon : il est sous cette ligne de base.",
    "La vraie question : sur toutes les fraudes réelles, combien le modèle en a-t-il détectées ? C'est ce que mesure le recall.",
    "Vérifiez d'abord le class imbalance, puis choisissez la métrique.",
  ],
};

export const DEMO_LANGUAGES = ["English", "Telugu", "Hindi", "Spanish", "French"];

export function buildExplanation(req: ExplanationRequest): Explanation {
  const lang = req.language.trim().toLowerCase();

  // The curated explanations are all about the sample lesson. Handing them to
  // a student working on something else would be worse than saying nothing.
  if (!isSampleLessonConcept(req.concept)) {
    return {
      style: req.style,
      language: "English",
      title: "Not available without a model key",
      body: [
        `Explain My Way rewrites a concept into whichever style or language you ask for, but it needs a language model to do that for "${req.concept}".`,
        "Without one, this build only carries hand-written explanations for its sample lesson: accuracy, precision, recall and class imbalance.",
        "Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local, restart, and every style and language works on any topic.",
      ],
      visual: [],
      keyTerms: [],
      generatedBy: "demo",
    };
  }

  if (lang && lang !== "english" && DEMO_TRANSLATIONS[lang]) {
    return {
      style: req.style,
      language: req.language,
      title: `${req.concept} — ${req.language}`,
      body: DEMO_TRANSLATIONS[lang],
      visual: VISUAL_BLOCKS,
      keyTerms: KEY_TERMS,
      generatedBy: "demo",
    };
  }

  const bodies: Record<string, string[]> = {
    simple: [
      "Accuracy just counts how many answers the model got right out of everything it looked at.",
      "If almost every transaction is normal, the model can score very well by saying \"normal\" every single time. It never has to spot a single fraud.",
      "So a high accuracy score does not mean the model is finding fraud. It might mean the fraud is rare enough to ignore.",
      "The question worth asking is: out of all the real frauds, how many did it catch? That is recall.",
    ],
    technical: [
      "Accuracy = (TP + TN) / (TP + TN + FP + FN). Under class imbalance the TN term dominates the numerator and the denominator, so the metric is effectively a measure of majority-class performance.",
      "With a positive-class prevalence of 1%, the trivial classifier h(x) = negative attains accuracy 0.99 with TP = 0. Any reported accuracy below that baseline is strictly worse than not modelling at all.",
      "Recall = TP / (TP + FN) removes the TN term entirely and is therefore invariant to the size of the majority class — which is exactly the property you need when the positive class is rare.",
      "For imbalanced evaluation, report recall at a fixed precision, or precision–recall AUC. ROC-AUC is also optimistic under strong imbalance because the false-positive rate is normalised by a very large TN count.",
    ],
    "step-by-step": [
      "Write down how often the positive class actually occurs. Here: 1% fraud.",
      "Compute the majority-class baseline — the accuracy of a model that always predicts the common class. Here: 99%.",
      "Compare the reported score against that baseline. 95% is below 99%, so the model is worse than predicting nothing.",
      "Ask which errors the metric can see. Accuracy includes true negatives, so missed frauds barely move it.",
      "Switch to a metric that excludes true negatives. Recall = TP / (TP + FN) counts exactly the frauds you missed.",
      "Only now compare models — the measurement is finally capable of separating them.",
    ],
    visual: [
      "10,000 transactions · 100 are fraud.",
      "Model says \"not fraud\" to everything → 9,900 right → 99% accuracy.",
      "Frauds caught: 0. Recall: 0%.",
      "High accuracy · zero usefulness.",
    ],
    analogy: [
      "Imagine a doctor who tells every single patient \"you're fine\" without examining anyone.",
      "In a healthy population, that doctor is right about 99 times out of 100. On paper their record looks outstanding.",
      "But they have never once found a sick patient. Their score is high because illness is rare, not because they are good at diagnosis.",
      "Accuracy is that doctor's record. Recall asks the question that actually matters: of the people who were genuinely ill, how many did you catch?",
    ],
  };

  const titles: Record<string, string> = {
    simple: "In plain language",
    technical: "The technical account",
    "step-by-step": "Step by step",
    visual: "Low-text visual",
    analogy: "A real-world analogy",
  };

  return {
    style: req.style,
    language: "English",
    title: titles[req.style] ?? "Explanation",
    body: bodies[req.style] ?? bodies.simple,
    visual: VISUAL_BLOCKS,
    keyTerms: KEY_TERMS,
    generatedBy: "demo",
  };
}

const VISUAL_BLOCKS = [
  { label: "10,000", detail: "transactions in total" },
  { label: "100", detail: "of them are fraud (1%)" },
  { label: '"not fraud" ×10,000', detail: "what a lazy model predicts" },
  { label: "99%", detail: "accuracy it scores anyway" },
  { label: "0", detail: "frauds caught — recall 0%" },
];

const KEY_TERMS = [
  { term: "Accuracy", meaning: "(TP + TN) / everything — dominated by the common class." },
  { term: "Recall", meaning: "TP / (TP + FN) — of the real frauds, how many were caught." },
  { term: "Precision", meaning: "TP / (TP + FP) — of what was flagged, how much was real." },
  { term: "Class imbalance", meaning: "One outcome is far more common than the other." },
];

/* ------------------------------------------------------------------ */
/* PerspectiveLab                                                      */
/* ------------------------------------------------------------------ */

const PERSPECTIVES: Perspective[] = [
  {
    id: "doctor",
    persona: "Emergency physician",
    domain: "Medical diagnosis",
    glyph: "🩺",
    headline: "I would rather order a needless scan than miss the tumour.",
    body: "In screening, a missed case can be fatal and a false alarm costs a follow-up appointment. That asymmetry is the whole decision. So I run tests tuned for recall — catch everything that could be the disease — and accept that some healthy patients get called back. If someone showed me a screen with 98% accuracy for a disease that affects 2% of people, my first question would be how many real cases it found, because a machine that says \"healthy\" to everyone hits 98% and helps nobody.",
    resource: {
      title: "Sensitivity and specificity in clinical testing",
      url: "https://en.wikipedia.org/wiki/Sensitivity_and_specificity",
      kind: "article",
    },
  },
  {
    id: "security",
    persona: "Security analyst",
    domain: "Threat detection",
    glyph: "🛡️",
    headline: "Attacks are rare. That is exactly what makes the numbers lie.",
    body: "Maybe one request in fifty thousand is an intrusion attempt. A detector that never alerts is 99.998% accurate and completely useless — and I have genuinely been shown dashboards like that. What I look at is how many real intrusions were caught, and how much noise my analysts had to wade through to find them. High accuracy on a rare-event problem is the default state of doing nothing, not evidence that the system works.",
    resource: {
      title: "Base rate fallacy in intrusion detection",
      url: "https://en.wikipedia.org/wiki/Base_rate_fallacy",
      kind: "article",
    },
  },
  {
    id: "teacher",
    persona: "Examinations officer",
    domain: "Grading and assessment",
    glyph: "📋",
    headline: "Marking every script \"pass\" gives you a wonderful pass rate.",
    body: "If 95% of a cohort passes anyway, an examiner who ticks every paper without reading agrees with the real outcome 95% of the time. Their agreement rate looks excellent. But ask how many of the genuinely failing students they identified, and the answer is none. That second question — of the students who really needed help, how many did we find — is recall, and it is the only one that tells you whether the marking did any work.",
  },
  {
    id: "data-scientist",
    persona: "Data scientist",
    domain: "The formal account",
    glyph: "📊",
    headline: "Accuracy carries a true-negative term. Recall does not.",
    body: "Accuracy = (TP + TN) / (TP + TN + FP + FN). When negatives outnumber positives 99 to 1, TN dominates both the numerator and the denominator, so the metric is essentially reporting majority-class performance. Recall = TP / (TP + FN) drops TN entirely, which makes it invariant to how many easy negatives you pile on. That algebraic difference — one term present, one term absent — is the entire reason the two metrics disagree under imbalance.",
    resource: {
      title: "Precision and recall",
      url: "https://en.wikipedia.org/wiki/Precision_and_recall",
      kind: "article",
    },
  },
  {
    id: "everyday",
    persona: "Everyday analogy",
    domain: "Explain it to a ten-year-old",
    glyph: "🎣",
    headline: "A net with huge holes still catches nothing in an empty lake.",
    body: "Suppose there are a thousand fish in a lake and only ten of them are the rare golden kind. You dip a net once, pull up nothing, and announce that you were right about 990 fish — all the ordinary ones you correctly left alone. That is true, and it is meaningless. The only interesting question is how many golden fish you actually caught. Accuracy counts all the fish you left alone; recall counts the golden ones you found.",
  },
];

export function buildPerspectives(concept: string): PerspectiveSet {
  // Same rule as explanations: these personas all speak about the sample
  // lesson, so on any other topic we return nothing rather than the wrong
  // subject dressed up as an expert.
  if (!isSampleLessonConcept(concept)) {
    return { concept, perspectives: [], generatedBy: "demo" };
  }
  return { concept, perspectives: PERSPECTIVES, generatedBy: "demo" };
}

/* ------------------------------------------------------------------ */
/* Teach-back verification                                             */
/* ------------------------------------------------------------------ */

const TEACHBACK_CONCEPTS: { key: string; label: string; signals: string[] }[] = [
  {
    key: "imbalance",
    label: "the class imbalance",
    signals: ["imbalance", "1%", "rare", "99%", "majority", "most transactions", "only a few"],
  },
  {
    key: "baseline",
    label: "the trivial-baseline argument",
    signals: [
      "always predict",
      "always say",
      "predicting not fraud",
      "predict not fraud",
      "never flag",
      "guess not fraud",
      "baseline",
      "without doing anything",
      "saying no every time",
      "labels everything",
    ],
  },
  {
    key: "errors",
    label: "the difference between the error types",
    signals: ["false negative", "missed fraud", "misses fraud", "let through", "not caught", "false positive"],
  },
  {
    key: "metric",
    label: "the metric that repairs it",
    signals: ["recall", "precision", "confusion matrix", "pr curve", "precision-recall"],
  },
];

const TRANSFER_SIGNALS = [
  "disease",
  "cancer",
  "spam",
  "medical",
  "security",
  "intrusion",
  "search",
  "any rare",
  "in general",
  "same applies",
  "other domain",
  "for example",
  "similarly",
];

const MEMORISED_MARKERS = [
  "the formula is",
  "as we learned",
  "by definition accuracy is",
  "tp+tn",
  "tp + tn",
];

export function evaluateTeachBack(
  text: string,
  originalMisconception: string,
  concept = "",
): TeachBackEvaluation {
  // The rubric below checks for the sample lesson's specific ideas, so it
  // cannot judge an explanation about anything else. Say that plainly rather
  // than scoring a physics answer against a metrics checklist.
  if (concept && !isSampleLessonConcept(concept)) {
    return {
      resolved: false,
      misconceptionStillPresent: false,
      conceptsCovered: [],
      conceptsMissing: [],
      appearsMemorised: false,
      canTransfer: false,
      masteryState: "yellow",
      score: 0,
      feedback: `Your explanation was recorded, but this build cannot mark it. Without a language model, teach-back is graded against a rubric written for one lesson — accuracy, precision, recall and class imbalance — and grading a "${concept}" answer against that rubric would tell you nothing true.`,
      nextStep:
        "Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local and submit again to have this explanation actually assessed.",
      generatedBy: "demo",
    };
  }

  const t = norm(text);
  const words = t.split(/\s+/).filter(Boolean).length;

  const covered: string[] = [];
  const missing: string[] = [];
  for (const concept of TEACHBACK_CONCEPTS) {
    if (concept.signals.some((s) => t.includes(s))) covered.push(concept.label);
    else missing.push(concept.label);
  }

  // Does the original misconception still drive the explanation?
  const relapse = classifyReasoning(text, null, null);
  const stillPresent =
    !relapse.correct &&
    relapse.profile != null &&
    covered.length < 2 &&
    relapse.confidence > 0.6;

  const canTransfer = TRANSFER_SIGNALS.some((s) => t.includes(s));
  const appearsMemorised =
    words < 25 && MEMORISED_MARKERS.some((s) => t.includes(s));

  const coverageScore = (covered.length / TEACHBACK_CONCEPTS.length) * 70;
  const depthScore = Math.min(15, (words / 60) * 15);
  const transferScore = canTransfer ? 15 : 0;
  let score = Math.round(coverageScore + depthScore + transferScore);
  if (stillPresent) score = Math.min(score, 35);
  if (appearsMemorised) score = Math.min(score, 55);
  score = Math.max(0, Math.min(100, score));

  let masteryState: MasteryState;
  if (stillPresent || covered.length <= 1) masteryState = "red";
  else if (covered.length === 2 || appearsMemorised) masteryState = "yellow";
  else if (!canTransfer) masteryState = "green";
  else masteryState = "blue";

  const resolved = !stillPresent && covered.length >= 3 && score >= 60;

  return {
    resolved,
    misconceptionStillPresent: stillPresent,
    conceptsCovered: covered,
    conceptsMissing: missing,
    appearsMemorised,
    canTransfer,
    masteryState,
    score,
    feedback: buildTeachBackFeedback({
      resolved,
      stillPresent,
      covered,
      missing,
      canTransfer,
      appearsMemorised,
      words,
      originalMisconception,
    }),
    nextStep: resolved
      ? canTransfer
        ? "Nothing outstanding. Your teacher's dashboard now shows this concept as resolved."
        : "Try one transfer question in a different domain to move from green to blue."
      : stillPresent
        ? "Re-read the counterexample in your diagnosis, then run one more ErrorTwin question before trying again."
        : `Add the missing piece: ${missing[0] ?? "a concrete example"}.`,
    generatedBy: "demo",
  };
}

function buildTeachBackFeedback(a: {
  resolved: boolean;
  stillPresent: boolean;
  covered: string[];
  missing: string[];
  canTransfer: boolean;
  appearsMemorised: boolean;
  words: number;
  originalMisconception: string;
}): string {
  const parts: string[] = [];

  if (a.words < 12) {
    parts.push(
      "That is too short to tell whether the idea is really yours. Explain it as though the person opposite has never heard of accuracy.",
    );
  }

  if (a.stillPresent) {
    parts.push(
      `The original misconception is still driving this explanation — you are again reasoning that ${a.originalMisconception.toLowerCase()} Nothing in your answer compares the score against what a do-nothing model would get.`,
    );
  } else if (a.covered.length > 0) {
    parts.push(`Your explanation does establish ${joinList(a.covered)}.`);
  }

  if (a.appearsMemorised) {
    parts.push(
      "This reads as recalled phrasing rather than an argument — you state the definition but never apply it to the 1% fraud case.",
    );
  }

  if (a.missing.length > 0 && !a.resolved) {
    parts.push(`Still missing: ${joinList(a.missing)}.`);
  }

  if (a.resolved) {
    parts.push(
      a.canTransfer
        ? "You also carried the argument into a second domain, which is the strongest evidence that the reasoning transferred rather than the example being memorised."
        : "The core argument is sound. It is still anchored to the fraud example, so the next step is applying it somewhere else.",
    );
  }

  return parts.join(" ");
}

/** "a, b and c" — so generated feedback reads as a sentence, not a list dump. */
function joinList(items: string[]): string {
  if (items.length === 0) return "nothing yet";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Evaluate an ErrorTwin practice answer. */
export function evaluatePractice(
  question: { correctOptionId: string; options: { id: string }[] },
  selectedOptionId: string,
  misconceptionOptionIds: string[] = [],
): { isCorrect: boolean; repeatedMisconception: boolean } {
  const isCorrect = selectedOptionId === question.correctOptionId;
  return {
    isCorrect,
    repeatedMisconception:
      !isCorrect && misconceptionOptionIds.includes(selectedOptionId),
  };
}
