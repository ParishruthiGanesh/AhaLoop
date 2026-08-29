import { fail, guard, ok, readJson } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { SessionStatus } from "@/lib/types";

const VALID: SessionStatus[] = ["lobby", "live", "ended"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return guard(async () => {
    const teacher = await requireRole("teacher");
    const { id } = await params;
    const body = await readJson<{ status: SessionStatus }>(request);

    if (!body.status || !VALID.includes(body.status)) {
      return fail("Status must be one of: lobby, live, ended.");
    }

    const store = await getStore();
    const session = await store.getSession(id);
    if (!session) return fail("Session not found.", 404);
    if (session.teacherId !== teacher.id) {
      return fail("This is not your session.", 403);
    }

    const updated = await store.setSessionStatus(id, body.status);
    return ok({ session: updated });
  });
}
