import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { resolvePeriod, type PeriodKey } from "@/lib/dates";
import { getDashboard } from "@/server/services/dashboard";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const p = new URL(req.url).searchParams;
    const range = resolvePeriod((p.get("periodo") ?? "mes-atual") as PeriodKey, p.get("de") ?? undefined, p.get("ate") ?? undefined);
    return NextResponse.json(await getDashboard(userId, range));
  } catch (e) { return errorResponse(e); }
}
