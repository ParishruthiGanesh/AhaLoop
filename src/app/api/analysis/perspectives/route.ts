import { guard, ok, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { perspectives } from "@/lib/ai/analysis";
import { SAMPLE_CONCEPT } from "@/lib/lesson";

/** PerspectiveLab — the same concept through different expert lenses. */
export async function POST(request: Request) {
  return guard(async () => {
    await requireUser();
    const body = await readJson<{ concept: string; misconception: string }>(
      request,
    );

    const set = await perspectives(
      (body.concept ?? "").trim() || SAMPLE_CONCEPT,
      (body.misconception ?? "").trim() ||
        "Accuracy always represents model quality.",
    );

    return ok({ perspectiveSet: set });
  });
}

export const maxDuration = 60;
