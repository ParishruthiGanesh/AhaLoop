import type { ErrorTwinQuestion } from "./types";

/**
 * ErrorTwin practice banks.
 *
 * Each set escalates: a near-identical case, the same trap in a new domain,
 * a boundary case, a question that demands an explanation, and a transfer
 * question from an unrelated field. Every set keeps one distractor built
 * directly out of the student's own misconception, so a repeat mistake is
 * detectable rather than just "wrong".
 */
export const ERROR_TWIN_BANK: Record<string, ErrorTwinQuestion[]> = {
  "accuracy-is-quality": [
    {
      id: "et-a1",
      kind: "similar",
      prompt:
        "A rare-disease screening model reports 98% accuracy. The disease occurs in 2% of the population. What can you conclude?",
      options: [
        { id: "a", text: "The model is strong — it is right 98% of the time." },
        { id: "b", text: "Nothing yet — a model that always predicts \"healthy\" also scores 98%." },
        { id: "c", text: "The model must have high recall to reach 98%." },
        { id: "d", text: "Accuracy this high guarantees few false negatives." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "98% is exactly the majority-class baseline here. The score tells you nothing until you compare it against \"always predict healthy\".",
    },
    {
      id: "et-a2",
      kind: "new-context",
      prompt:
        "A content platform's harmful-post classifier reports 99.4% accuracy. Harmful posts are 0.6% of all posts. A reviewer says the model is production-ready. What is the strongest objection?",
      options: [
        { id: "a", text: "99.4% is below the 99.9% needed for production." },
        { id: "b", text: "The training set was probably too small." },
        { id: "c", text: "99.4% is the score of a model that flags nothing at all, so the number is uninformative." },
        { id: "d", text: "Accuracy is fine here because both classes matter equally." },
      ],
      correctOptionId: "c",
      trapExplanation:
        "The objection is not that the number is too low — it is that this exact number is achievable by doing nothing.",
    },
    {
      id: "et-b1",
      kind: "boundary",
      prompt:
        "A dataset is perfectly balanced: 50% fraud, 50% legitimate. A model reports 95% accuracy. Is accuracy now a reasonable headline metric?",
      options: [
        { id: "a", text: "No — accuracy is never a valid metric for classification." },
        { id: "b", text: "Yes — with balanced classes the majority baseline is only 50%, so 95% is genuinely informative." },
        { id: "c", text: "No — you must always use recall instead of accuracy." },
        { id: "d", text: "Yes, and precision and recall are now unnecessary." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Over-correcting to \"accuracy is always bad\" is the mirror image of the original mistake. Accuracy is misleading under imbalance, not in general.",
    },
    {
      id: "et-c1",
      kind: "explain",
      prompt:
        "A colleague says: \"Our model went from 97% to 98% accuracy, so it now catches more fraud.\" Which response identifies the flaw?",
      options: [
        { id: "a", text: "Accuracy rose, so fraud detection did improve." },
        { id: "b", text: "The gain could come entirely from classifying legitimate transactions better, while fraud recall fell." },
        { id: "c", text: "One percentage point is too small to matter statistically." },
        { id: "d", text: "They should retrain with a larger neural network." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Accuracy aggregates both classes. Under imbalance, movement in the majority class swamps everything the minority class does.",
    },
    {
      id: "et-t1",
      kind: "transfer",
      prompt:
        "An airport scanner flags 0.01% of bags. It reports 99.98% accuracy. Security wants to know if it is working. Which single number should they ask for?",
      options: [
        { id: "a", text: "Overall accuracy, measured on more bags." },
        { id: "b", text: "Recall on the threat class — the share of real threats it actually flagged." },
        { id: "c", text: "The number of bags processed per hour." },
        { id: "d", text: "The algorithm family the vendor used." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Same structure as the fraud case in a different domain: the rare class is the one you care about, so ask the metric that can see it.",
    },
  ],
  "precision-recall-swap": [
    {
      id: "et-p1",
      kind: "similar",
      prompt:
        "Of 100 real frauds, a model flags 8 transactions and all 8 are genuinely fraud. Which is true?",
      options: [
        { id: "a", text: "Precision 100%, recall 8%." },
        { id: "b", text: "Precision 8%, recall 100%." },
        { id: "c", text: "Both precision and recall are 8%." },
        { id: "d", text: "Both are 100%, since every flag was correct." },
      ],
      correctOptionId: "a",
      trapExplanation:
        "Precision divides by what the model flagged (8). Recall divides by what really existed (100). Swap the denominators and the story inverts.",
    },
    {
      id: "et-p2",
      kind: "new-context",
      prompt:
        "A spam filter moves 500 emails to spam; 450 really are spam. Across the inbox there were 900 spam emails in total. Which pair is correct?",
      options: [
        { id: "a", text: "Precision 50%, recall 90%." },
        { id: "b", text: "Precision 90%, recall 50%." },
        { id: "c", text: "Precision 90%, recall 90%." },
        { id: "d", text: "Precision 45%, recall 45%." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "450/500 = 90% precision (of what was flagged). 450/900 = 50% recall (of what existed).",
    },
    {
      id: "et-p3",
      kind: "boundary",
      prompt:
        "A model flags exactly one transaction in the whole dataset, and it is fraud. What are its precision and recall?",
      options: [
        { id: "a", text: "Precision 100%, recall near 0% — perfect precision is trivial to fake." },
        { id: "b", text: "Precision near 0%, recall 100%." },
        { id: "c", text: "Both undefined." },
        { id: "d", text: "Both 100% — it made no mistakes." },
      ],
      correctOptionId: "a",
      trapExplanation:
        "Precision can be maximised by flagging almost nothing. That is why it is never reported alone.",
    },
    {
      id: "et-p4",
      kind: "explain",
      prompt:
        "Which sentence correctly states what recall answers?",
      options: [
        { id: "a", text: "Of everything the model flagged, how much was really positive?" },
        { id: "b", text: "Of everything that was really positive, how much did the model flag?" },
        { id: "c", text: "Of all predictions, how many were correct?" },
        { id: "d", text: "How confident the model is in each prediction." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Option (a) is precision, option (c) is accuracy. Reading them side by side is what fixes the swap.",
    },
    {
      id: "et-p5",
      kind: "transfer",
      prompt:
        "A search engine returns 10 results; 9 are relevant. There were 400 relevant pages on the web. Which metric is 90%?",
      options: [
        { id: "a", text: "Recall." },
        { id: "b", text: "Precision." },
        { id: "c", text: "Accuracy." },
        { id: "d", text: "F1 score." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "9 of 10 returned = precision. Recall would be 9/400 ≈ 2%. Search results are a precision-first product for exactly this reason.",
    },
  ],
  "metric-formula-only": [
    {
      id: "et-m1",
      kind: "similar",
      prompt:
        "For a hospital sepsis-alert model, which error is more expensive, and which metric follows from that?",
      options: [
        { id: "a", text: "A false alarm; optimise precision." },
        { id: "b", text: "A missed case; optimise recall." },
        { id: "c", text: "Neither; optimise accuracy." },
        { id: "d", text: "Cannot be decided without the formulas." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "The formula is not the deciding factor — the cost of a missed sepsis case is. Name the expensive error first, then the metric follows.",
    },
    {
      id: "et-m2",
      kind: "new-context",
      prompt:
        "An email client auto-deletes messages classified as spam, with no spam folder. Which metric should lead?",
      options: [
        { id: "a", text: "Recall — catch every last spam message." },
        { id: "b", text: "Precision — a deleted real email is unrecoverable, so false positives dominate." },
        { id: "c", text: "Accuracy — both errors are equal here." },
        { id: "d", text: "Whichever is currently higher." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Same maths as the fraud case, opposite answer, because the expensive error moved to the other cell.",
    },
    {
      id: "et-m3",
      kind: "boundary",
      prompt:
        "A team pushes recall to 100% by flagging every transaction as fraud. What happened?",
      options: [
        { id: "a", text: "They solved the problem — no fraud is missed." },
        { id: "b", text: "They traded all their precision away; every legitimate customer is now declined." },
        { id: "c", text: "Accuracy also became 100%." },
        { id: "d", text: "Recall cannot reach 100%." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Any single metric can be maximised by degenerate behaviour. The choice is always a trade, never a free win.",
    },
    {
      id: "et-m4",
      kind: "explain",
      prompt:
        "What is the first question to ask when choosing between precision and recall?",
      options: [
        { id: "a", text: "Which formula is easier to compute on this dataset?" },
        { id: "b", text: "Which mistake — a false positive or a false negative — costs more in this specific setting?" },
        { id: "c", text: "Which metric scored higher last time?" },
        { id: "d", text: "Which metric the algorithm was trained to optimise?" },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Metric selection is a decision about consequences. Everything else follows from naming the expensive error.",
    },
    {
      id: "et-m5",
      kind: "transfer",
      prompt:
        "A factory camera rejects defective parts. A missed defect reaches a customer; a false rejection scraps a good part worth $2. Defects cost $5,000 in recalls. Which metric leads?",
      options: [
        { id: "a", text: "Precision — scrapped parts cost money." },
        { id: "b", text: "Recall — a missed defect costs 2,500× a false rejection." },
        { id: "c", text: "Accuracy — it balances both." },
        { id: "d", text: "None; use the raw defect count." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "The numbers make the trade explicit: when one error is orders of magnitude more expensive, the metric that watches it leads.",
    },
  ],
  "algorithm-attribution": [
    {
      id: "et-g1",
      kind: "similar",
      prompt:
        "A team replaces logistic regression with a deep neural network. Accuracy on 1%-fraud data stays at 99%, recall stays at 4%. What does this show?",
      options: [
        { id: "a", text: "The neural network was configured incorrectly." },
        { id: "b", text: "The evaluation problem is in the data distribution and the metric, not in the algorithm." },
        { id: "c", text: "Deep learning does not work for tabular data." },
        { id: "d", text: "They need more training epochs." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Changing the model cannot change what accuracy is blind to. The measurement has to be fixed first.",
    },
    {
      id: "et-g2",
      kind: "new-context",
      prompt:
        "Two teams report 96% accuracy on the same rare-event dataset with completely different architectures. What is the most likely explanation?",
      options: [
        { id: "a", text: "Both architectures are equally sophisticated." },
        { id: "b", text: "Both are mostly predicting the majority class, which the shared class distribution rewards." },
        { id: "c", text: "One of them is cheating." },
        { id: "d", text: "96% is a natural ceiling for this problem." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "When wildly different models converge on the same score, the data distribution is usually doing the work — not the models.",
    },
    {
      id: "et-g3",
      kind: "boundary",
      prompt:
        "When *does* the algorithm choice genuinely change your metric results?",
      options: [
        { id: "a", text: "Never — the algorithm is irrelevant to evaluation." },
        { id: "b", text: "Once you evaluate with a metric that can see the minority class, models genuinely differ in recall and precision." },
        { id: "c", text: "Only for image data." },
        { id: "d", text: "Only when the dataset is imbalanced." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "The point is not that models never matter — it is that you cannot compare them through a metric that is blind to the class you care about.",
    },
    {
      id: "et-g4",
      kind: "explain",
      prompt:
        "Your model has 99% accuracy and 3% recall on a rare class. What do you change first?",
      options: [
        { id: "a", text: "The algorithm — try gradient boosting." },
        { id: "b", text: "The metric you report and optimise, so that minority-class errors become visible." },
        { id: "c", text: "Collect ten times more data of the same kind." },
        { id: "d", text: "Nothing — 99% is already strong." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Fix the instrument before you tune what it is measuring.",
    },
    {
      id: "et-g5",
      kind: "transfer",
      prompt:
        "A thermometer reads 20°C in every room of a building. Before buying a better thermometer, what should you check?",
      options: [
        { id: "a", text: "Whether the thermometer brand is reputable." },
        { id: "b", text: "Whether the instrument is capable of registering the differences you care about at all." },
        { id: "c", text: "Whether the building has more rooms." },
        { id: "d", text: "Whether 20°C is a comfortable temperature." },
      ],
      correctOptionId: "b",
      trapExplanation:
        "Same shape as the algorithm mistake: a broken measurement makes every subject look alike, so upgrading the subject changes nothing.",
    },
  ],
};

/** Fallback set used when a concept has no dedicated bank. */
export const GENERIC_BANK: ErrorTwinQuestion[] = [
  {
    id: "et-x1",
    kind: "similar",
    prompt:
      "Before trusting a single headline metric, what should you always establish first?",
    options: [
      { id: "a", text: "What score a trivial baseline achieves on the same data." },
      { id: "b", text: "Which algorithm produced it." },
      { id: "c", text: "How long training took." },
      { id: "d", text: "Whether the number is above 90%." },
    ],
    correctOptionId: "a",
    trapExplanation:
      "A metric is only informative relative to what doing nothing would score.",
  },
  {
    id: "et-x2",
    kind: "new-context",
    prompt:
      "Two metrics disagree about whether a model is good. What does that usually mean?",
    options: [
      { id: "a", text: "One of them was computed incorrectly." },
      { id: "b", text: "They are sensitive to different errors, and you must decide which error matters here." },
      { id: "c", text: "You should average them." },
      { id: "d", text: "The model is broken." },
    ],
    correctOptionId: "b",
    trapExplanation:
      "Disagreement between metrics is information about the errors, not a computation bug.",
  },
  {
    id: "et-x3",
    kind: "transfer",
    prompt:
      "A measurement gives the same result for every subject you test. What is the first hypothesis?",
    options: [
      { id: "a", text: "All the subjects are genuinely identical." },
      { id: "b", text: "The measurement cannot detect the difference you care about." },
      { id: "c", text: "You need a larger sample." },
      { id: "d", text: "The result is correct and needs no follow-up." },
    ],
    correctOptionId: "b",
    trapExplanation:
      "When an instrument cannot separate cases, suspect the instrument before the cases.",
  },
];
