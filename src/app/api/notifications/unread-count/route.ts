import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await requireUserId();
    const count = await prisma.notification.count({
      where: { userId, readAt: null },
    });
    return NextResponse.json({ count });
  } catch (error) {
    return errorResponse(error);
  }
}
