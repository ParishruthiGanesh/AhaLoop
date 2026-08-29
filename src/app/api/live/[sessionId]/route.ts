import { fail, guard, ok } from "@/lib/api";
import { assertSessionMember, requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/**
 * Live snapshot used by both dashboards.
 *
 * In connected mode Supabase Realtime pushes change events and the client
 * re-fetches this; in demo mode the client polls it directly. Either way the
 * rendering path is identical.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  return guard(async () => {
    const user = await requireUser();
    const { sessionId } = await params;
    const store = await getStore();
    const snapshot = await store.getSnapshot(sessionId);
    if (!snapshot) return fail("Session not found.", 404);

    await assertSessionMember(user, snapshot.session, (id, userId) =>
      store.findParticipantByUser(id, userId),
    );

    return ok(snapshot);
  });
}

export const dynamic = "force-dynamic";
