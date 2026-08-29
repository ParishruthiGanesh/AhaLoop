import { fail, guard, ok } from "@/lib/api";
import { assertSessionMember, requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guard(async () => {
    const user = await requireUser();
    const { id } = await params;
    const store = await getStore();
    const snapshot = await store.getSnapshot(id);
    if (!snapshot) return fail("Session not found.", 404);

    await assertSessionMember(user, snapshot.session, (sid, userId) =>
      store.findParticipantByUser(sid, userId),
    );

    return ok(snapshot);
  });
}
