import { fail, guard, ok, readJson, requireString } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

/** Resolve a join code and register the current user as a participant. */
export async function POST(request: Request) {
  return guard(async () => {
    const user = await requireUser();
    const body = await readJson<{ code: string; anonymous?: boolean }>(request);
    const code = requireString(body.code, "Join code", { max: 12 });

    const store = await getStore();
    const session = await store.getSessionByCode(code);
    if (!session) {
      return fail(
        "No classroom found with that code. Check the code on your teacher's screen.",
        404,
      );
    }
    if (session.status === "ended") {
      return fail("That session has already ended.", 410);
    }

    const participant = await store.joinSession({
      sessionId: session.id,
      userId: user.id,
      displayName: user.fullName || user.email,
      isAnonymous: Boolean(body.anonymous),
    });

    return ok({ session, participant });
  });
}
