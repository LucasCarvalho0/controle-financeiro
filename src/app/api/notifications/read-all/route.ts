import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function PATCH() {
  try {
    const userId = await requireUserId();
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    return errorResponse(error);
  }
}
