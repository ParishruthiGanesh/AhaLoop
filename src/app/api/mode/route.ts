import { guard, ok } from "@/lib/api";
import { getModeInfo } from "@/lib/config";

/** Reports which backends are configured. Never exposes key values. */
export async function GET() {
  return guard(async () => ok(getModeInfo()));
}
