import type { Question } from "./types";

/**
 * The question a student should be answering right now.
 *
 * This is the most recently *published* question — not the most recently
 * created one. A teacher can write several questions as drafts and publish
 * them in a different order, and it is the act of publishing that opens the
 * floor. Ordering by creation left students stuck on an older question that
 * happened to be written last.
 */
export function activeQuestion(questions: Question[]): Question | null {
  let active: Question | null = null;
  let activeAt = "";

  for (const question of questions) {
    if (question.status !== "published") continue;
    // Fall back to createdAt for rows published before publishedAt was set.
    const at = question.publishedAt ?? question.createdAt;
    if (active === null || at > activeAt) {
      active = question;
      activeAt = at;
    }
  }

  return active;
}
