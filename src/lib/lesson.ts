import type { Question, QuestionOption } from "./types";

/**
 * The polished sample lesson: accuracy, precision, recall and class imbalance.
 *
 * Everything here is demonstration content. It is surfaced in the UI behind
 * explicit "Demo data" labelling so nothing reads as a real classroom metric.
 */

export const SAMPLE_CONCEPT = "Classification metrics under class imbalance";

export const SAMPLE_OPTIONS: QuestionOption[] = [
  { id: "a", text: "Yes — 95% accuracy means it catches almost all fraud." },
  { id: "b", text: "No — with 1% fraud, predicting \"not fraud\" every time already scores 99%." },
  { id: "c", text: "Yes, as long as the model was trained on enough data." },
  { id: "d", text: "It depends only on which algorithm was used." },
];

export const SAMPLE_QUESTION_PROMPT =
  "A fraud-detection model reports 95% accuracy on a dataset where 1% of transactions are fraudulent. Is this a good model? Explain your reasoning.";

export const SAMPLE_CORRECT_OPTION_ID = "b";

/**
 * A misconception the platform knows how to diagnose and repair.
 * `signals` are lowercase substrings matched against a student's own words.
 */
export interface MisconceptionProfile {
  id: string;
  /** Short label used as the confusion-group name on the teacher dashboard. */
  label: string;
  /** Full statement of the belief. */
  misconception: string;
  /** Teacher-facing reading of what this group thinks. */
  interpretation: string;
  whyReasoningFails: string;
  counterexample: string;
  missingPrerequisites: string[];
  /** The reasoning habit, not the single wrong answer. */
  errorPattern: string;
  errorPatternDescription: string;
  signals: string[];
  /** Option ids that typically carry this misconception. */
  optionIds: string[];
  baseConfidence: number;
}

export const MISCONCEPTIONS: MisconceptionProfile[] = [
  {
    id: "accuracy-is-quality",
    label: "Accuracy treated as overall quality",
    misconception:
      "A high accuracy score always means the model is good, regardless of how the classes are distributed.",
    interpretation:
      "Students read accuracy as a single verdict on the model and never ask how often the positive class actually occurs.",
    whyReasoningFails:
      "Accuracy is the share of all predictions that are correct, so it is dominated by whichever class is most common. When 99% of transactions are legitimate, a model that predicts \"not fraud\" for every single transaction is 99% accurate and catches zero fraud. The score is high precisely because the model ignores the class you care about.",
    counterexample:
      "Take 10,000 transactions, 100 of them fraudulent. A model that always answers \"not fraud\" gets 9,900 of 10,000 right — 99% accuracy — while missing all 100 frauds. Its recall on fraud is 0%.",
    missingPrerequisites: [
      "class imbalance",
      "confusion matrix",
      "false negatives",
    ],
    errorPattern:
      "Selecting a metric before checking the class distribution",
    errorPatternDescription:
      "Your ErrorTwin reaches for the headline number first and only afterwards asks what the data looks like. It tends to accept any metric that is high, without asking which errors that metric is able to see.",
    signals: [
      "95% is high",
      "high accuracy",
      "accuracy is good",
      "accuracy means",
      "95 percent",
      "95%",
      "good model",
      "most of the time",
      "gets most",
      "correct most",
      "always good",
    ],
    optionIds: ["a", "c"],
    baseConfidence: 0.91,
  },
  {
    id: "precision-recall-swap",
    label: "Precision and recall confused",
    misconception:
      "Precision and recall are interchangeable, or their definitions are swapped.",
    interpretation:
      "Students know both terms exist and that both are about correctness, but cannot say which denominator each one uses.",
    whyReasoningFails:
      "The two metrics answer different questions. Precision asks: of everything the model flagged as fraud, how much really was fraud? Recall asks: of all the fraud that existed, how much did the model flag? Swapping them inverts what you are optimising — a model can flag one obvious fraud and reach 100% precision with almost zero recall.",
    counterexample:
      "Of 100 real frauds a model flags 5 transactions and all 5 are fraud. Precision = 5/5 = 100%. Recall = 5/100 = 5%. Perfect precision, and 95 frauds walked through.",
    missingPrerequisites: [
      "confusion matrix",
      "false positives",
      "false negatives",
    ],
    errorPattern: "Reciting metric names without their denominators",
    errorPatternDescription:
      "Your ErrorTwin remembers the vocabulary but not what each fraction is divided by, so it picks whichever term was mentioned most recently.",
    signals: [
      "precision and recall are",
      "precision is the same",
      "same as recall",
      "same thing",
      "recall is the same",
      "precision means all",
      "both measure",
      "interchangeable",
      "either one",
    ],
    optionIds: [],
    baseConfidence: 0.84,
  },
  {
    id: "metric-formula-only",
    label: "Formula known, application unclear",
    misconception:
      "The formulas are memorised, but which metric matters for a given problem is unclear.",
    interpretation:
      "Students can compute precision and recall correctly yet cannot decide which one this fraud problem should optimise.",
    whyReasoningFails:
      "Choosing a metric is a decision about which mistake is more expensive, not a calculation. In fraud detection a missed fraud (false negative) costs real money, so recall is the priority; in spam filtering a wrongly binned job offer (false positive) costs more, so precision leads. The formula cannot tell you that — the cost of each error does.",
    counterexample:
      "Same model, two jobs. As a cancer screen, missing a tumour is unacceptable, so you accept false alarms and push recall up. As a spam filter, losing a real email is unacceptable, so you push precision up instead.",
    missingPrerequisites: [
      "false positives",
      "false negatives",
      "cost of errors",
    ],
    errorPattern: "Computing metrics without connecting them to the decision",
    errorPatternDescription:
      "Your ErrorTwin can evaluate any formula it is handed but stalls when the question is which formula the situation calls for.",
    signals: [
      "formula",
      "tp / (tp",
      "tp/(tp",
      "true positives divided",
      "not sure which",
      "which metric",
      "don't know which",
      "do not know which",
      "how do i choose",
      "i can calculate",
      "i can compute",
    ],
    optionIds: [],
    baseConfidence: 0.78,
  },
  {
    id: "algorithm-attribution",
    label: "Quality attributed to the algorithm",
    misconception:
      "Model quality is decided by the choice of algorithm rather than by the data and the metric.",
    interpretation:
      "Students look for the answer in the model family — the data distribution never enters the reasoning.",
    whyReasoningFails:
      "Any algorithm trained on 99% legitimate transactions can reach 99% accuracy by learning to say \"not fraud\". Swapping a decision tree for a neural network does not change the class distribution, and it does not change which errors accuracy is blind to. The evaluation problem sits in the data and the metric, before the algorithm is chosen.",
    counterexample:
      "Train logistic regression, a random forest and a neural net on the same 1%-fraud data. All three can score about 99% accuracy and all three can have near-zero recall on fraud. The algorithm changed; the blindness did not.",
    missingPrerequisites: ["class imbalance", "evaluation vs. training"],
    errorPattern: "Explaining evaluation results with model choice",
    errorPatternDescription:
      "Your ErrorTwin answers questions about measurement by naming a model, so it skips the step where you check what the data looks like.",
    signals: [
      "algorithm",
      "which model",
      "neural network",
      "random forest",
      "depends on the model",
      "depends only on which",
      "logistic regression",
      "hyperparameter",
    ],
    optionIds: ["d"],
    baseConfidence: 0.8,
  },
];

/**
 * Does this concept fall inside the one lesson the built-in analyzer knows?
 * Used to decide whether demo-mode content is genuinely about the student's
 * topic, or whether we should say we cannot cover it without a model key.
 */
export function isSampleLessonConcept(concept: string): boolean {
  const c = concept.toLowerCase();
  return [
    "accuracy",
    "precision",
    "recall",
    "class imbalance",
    "imbalanced",
    "confusion matrix",
    "false negative",
    "false positive",
    "classification metric",
    "f1",
  ].some((term) => c.includes(term));
}

/** The one group that is not a misconception. */
export const CORRECT_GROUP_LABEL = "Correct understanding";

export const CORRECT_SIGNALS = [
  "class imbalance",
  "imbalanced",
  "99%",
  "always predict",
  "predicting not fraud",
  "predict not fraud",
  "never predict",
  "recall",
  "false negative",
  "baseline",
  "majority class",
  "confusion matrix",
];

/**
 * The prerequisite graph for the sample lesson. Prerequisite Detective walks
 * backwards through this to find the shortest repair path.
 */
export const PREREQUISITE_GRAPH: Record<
  string,
  {
    concept: string;
    why: string;
    explanation: string;
    example: string;
    checkQuestion: string;
    checkAnswer: string;
    dependsOn: string[];
  }
> = {
  "class imbalance": {
    concept: "Class imbalance",
    why: "Accuracy only misleads when one class dominates, so this is the concept that makes the whole problem visible.",
    explanation:
      "A dataset is imbalanced when one outcome is far more common than the other. With 1% fraud, the majority class is so large that a model can score well by never predicting the minority class at all. Before trusting any score, ask: what does a model that always guesses the majority class get?",
    example:
      "10,000 transactions, 100 fraudulent. \"Always not fraud\" scores 9,900/10,000 = 99%. That 99% is the floor, not an achievement — a real model has to beat it in a way accuracy cannot show.",
    checkQuestion:
      "In a dataset with 2% spam, what accuracy does a model that labels everything \"not spam\" achieve?",
    checkAnswer: "98% — the majority-class baseline.",
    dependsOn: [],
  },
  "confusion matrix": {
    concept: "The confusion matrix",
    why: "Every metric you are being asked to compare is built out of these four counts.",
    explanation:
      "A confusion matrix splits predictions into four cells: true positives (flagged and really fraud), false positives (flagged but legitimate), true negatives (not flagged and legitimate), false negatives (not flagged but really fraud). Precision, recall and accuracy are three different ways of dividing these four numbers.",
    example:
      "TP = 5, FP = 0, FN = 95, TN = 9,900. Accuracy = (5 + 9,900)/10,000 = 99%. Recall = 5/(5 + 95) = 5%. Same four numbers, opposite stories.",
    checkQuestion:
      "Which cell holds the frauds the model let through?",
    checkAnswer: "False negatives (FN).",
    dependsOn: ["true and false predictions"],
  },
  "false negatives": {
    concept: "False negatives",
    why: "This is the error that fraud detection actually pays for, and the one accuracy hides.",
    explanation:
      "A false negative is a positive case the model called negative — a real fraud it waved through. When the positive class is rare, false negatives barely move accuracy, because they are a tiny fraction of all predictions. Recall is the metric built to expose them.",
    example:
      "Missing all 100 frauds out of 10,000 transactions costs you 1% of accuracy and 100% of your recall.",
    checkQuestion:
      "A cancer screen misses 30 of 40 tumours. What is its recall?",
    checkAnswer: "10/40 = 25%.",
    dependsOn: ["true and false predictions"],
  },
  "false positives": {
    concept: "False positives",
    why: "Precision only makes sense once you can name the cost of a false alarm.",
    explanation:
      "A false positive is a negative case the model flagged as positive — a legitimate transaction declined, a real email in the spam bin. Precision measures how much of what you flagged deserved to be flagged, so it is the metric that responds to false alarms.",
    example:
      "Flag 200 transactions, and only 5 are fraud: precision = 5/200 = 2.5%. Every one of the other 195 customers had a card declined for nothing.",
    checkQuestion:
      "A spam filter flags 50 emails, 40 of them genuinely spam. What is its precision?",
    checkAnswer: "40/50 = 80%.",
    dependsOn: ["true and false predictions"],
  },
  "true and false predictions": {
    concept: "True vs. false predictions",
    why: "The base vocabulary — every later metric is a ratio of these.",
    explanation:
      "Each prediction is compared to reality and labelled two ways: \"true/false\" says whether the model was right, and \"positive/negative\" says what the model predicted. \"False negative\" therefore reads as: the model predicted negative, and it was wrong.",
    example:
      "Model says \"fraud\" and it was fraud -> true positive. Model says \"not fraud\" and it was fraud -> false negative.",
    checkQuestion:
      "The model predicts \"not spam\" for an email that really is spam. What is that?",
    checkAnswer: "A false negative.",
    dependsOn: [],
  },
  "cost of errors": {
    concept: "Cost of each error type",
    why: "Choosing between precision and recall is a decision about which mistake hurts more.",
    explanation:
      "Precision and recall trade against each other. Which one you optimise is decided outside the maths: name the cost of a false positive and the cost of a false negative in the real setting, and the more expensive error tells you which metric leads.",
    example:
      "Fraud: a missed fraud costs money -> optimise recall. Spam: a lost job offer costs more than a stray advert -> optimise precision.",
    checkQuestion:
      "An airport explosives scanner — precision or recall?",
    checkAnswer:
      "Recall: a missed threat is catastrophic, extra searches are merely inconvenient.",
    dependsOn: ["false positives", "false negatives"],
  },
  "evaluation vs. training": {
    concept: "Evaluation is separate from training",
    why: "Explains why swapping algorithms cannot fix a metric that is measuring the wrong thing.",
    explanation:
      "Training chooses the model's parameters; evaluation chooses how you judge the result. A badly chosen metric misjudges every algorithm equally, so no amount of model swapping repairs it. Fix the measurement first, then compare models.",
    example:
      "Three different algorithms on 1%-fraud data all report ~99% accuracy and near-zero recall. The metric, not the algorithm, is what is failing.",
    checkQuestion:
      "Your model has 99% accuracy and 3% recall on rare events. What do you change first?",
    checkAnswer:
      "The metric you are judging by — move to recall / PR-AUC — before swapping algorithms.",
    dependsOn: ["class imbalance"],
  },
};

/** Five simulated students, deliberately spanning distinct reasoning patterns. */
export interface SeedStudent {
  name: string;
  selectedOptionId: string;
  reasoning: string;
}

export const SEED_STUDENTS: SeedStudent[] = [
  {
    name: "Aarav Menon",
    selectedOptionId: "a",
    reasoning:
      "95% is a high score, so the model is getting almost everything right. Anything above 90% is a good model in my opinion.",
  },
  {
    name: "Bea Whitfield",
    selectedOptionId: "b",
    reasoning:
      "Only 1% of the transactions are fraud, so a model that just says 'not fraud' every time would already be 99% accurate. 95% is actually worse than doing nothing. You'd want to look at recall on the fraud class.",
  },
  {
    name: "Chen Liu",
    selectedOptionId: "c",
    reasoning:
      "I can calculate precision as TP/(TP+FP) and recall as TP/(TP+FN), but I'm not sure which metric we're supposed to use for fraud. The accuracy is high so I said yes.",
  },
  {
    name: "Dara Okafor",
    selectedOptionId: "d",
    reasoning:
      "It depends on which algorithm they used. A neural network would be better than logistic regression here, that's what decides if the model is good.",
  },
  {
    name: "Elif Demir",
    selectedOptionId: "a",
    reasoning:
      "Precision and recall are basically the same thing to me — they both measure how correct the model is. Since one of them is already high here, the other one must be high too, so the model is fine.",
  },
];

export function buildSampleQuestion(sessionId: string, id: string, now: string): Question {
  return {
    id,
    sessionId,
    prompt: SAMPLE_QUESTION_PROMPT,
    type: "mcq",
    options: SAMPLE_OPTIONS,
    correctOptionId: SAMPLE_CORRECT_OPTION_ID,
    concept: SAMPLE_CONCEPT,
    status: "published",
    allowAnonymous: false,
    createdAt: now,
    publishedAt: now,
  };
}
