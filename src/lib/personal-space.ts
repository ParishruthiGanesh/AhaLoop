import "server-only";

import type { Store } from "./store";
import type { Participant, Profile } from "./types";

/**
 * ConceptLens can be opened without any classroom — a student typing their own
 * confusion into the box. Diagnoses still hang off a participant row, so each
 * student gets one private "self-study" space, created on first use.
 *
 * Using the same tables keeps foreign keys valid under Supabase and means the
 * self-serve path is not a special case anywhere downstream.
 */
export const SELF_STUDY_TOPIC = "__self_study__";

export async function ensurePersonalParticipant(
  store: Store,
  user: Profile,
): Promise<Participant> {
  const existing = await store.listSessionsForParticipantUser(user.id);
  const personal = existing.find((s) => s.topic === SELF_STUDY_TOPIC);

  if (personal) {
    const participant = await store.findParticipantByUser(personal.id, user.id);
    if (participant) return participant;
  }

  const session =
    personal ??
    (await store.createSession({
      teacherId: user.id,
      title: "Self-study",
      topic: SELF_STUDY_TOPIC,
    }));

  return store.joinSession({
    sessionId: session.id,
    userId: user.id,
    displayName: user.fullName || user.email,
    isAnonymous: false,
  });
}

/** Hide self-study spaces from the classroom lists. */
export function isClassroom(topic: string): boolean {
  return topic !== SELF_STUDY_TOPIC;
}
