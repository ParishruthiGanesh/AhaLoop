import { guard, ok, readJson, requireString } from "@/lib/api";
import { requireRole, requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET() {
  return guard(async () => {
    const user = await requireUser();
    const store = await getStore();
    const sessions =
      user.role === "teacher"
        ? await store.listSessionsForTeacher(user.id)
        : await store.listSessionsForParticipantUser(user.id);
    return ok({ sessions });
  });
}

export async function POST(request: Request) {
  return guard(async () => {
    const teacher = await requireRole("teacher");
    const body = await readJson<{ title: string; topic: string }>(request);

    const store = await getStore();
    const session = await store.createSession({
      teacherId: teacher.id,
      title: requireString(body.title, "Session title", { max: 140 }),
      topic: requireString(body.topic, "Topic", { max: 200 }),
    });
    return ok({ session }, 201);
  });
}
