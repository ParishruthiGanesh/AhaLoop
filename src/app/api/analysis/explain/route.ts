import { guard, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { explain } from "@/lib/ai/analysis";
import { SAMPLE_CONCEPT } from "@/lib/lesson";
import type { ExplanationStyle } from "@/lib/types";

const STYLES: ExplanationStyle[] = [
  "simple",
  "technical",
  "step-by-step",
  "visual",
  "analogy",
];

/** Explain My Way — the same idea, rendered in the student's preferred form. */
export async function POST(request: Request) {
  return guard(async () => {
    await requireUser();
    const body = await readJson<{
      concept: string;
      misconception: string;
      style: ExplanationStyle;
      language: string;
      keepTechnicalTermsInEnglish: boolean;
    }>(request);

    const style: ExplanationStyle = STYLES.includes(body.style as ExplanationStyle)
      ? (body.style as ExplanationStyle)
      : "simple";

    const explanation = await explain({
      concept: (body.concept ?? "").trim() || SAMPLE_CONCEPT,
      misconception:
        (body.misconception ?? "").trim() ||
        "Accuracy always represents model quality.",
      style,
      language: (body.language ?? "English").trim() || "English",
      keepTechnicalTermsInEnglish: body.keepTechnicalTermsInEnglish !== false,
    });

    return ok({ explanation });
  });
}

export const maxDuration = 60;
