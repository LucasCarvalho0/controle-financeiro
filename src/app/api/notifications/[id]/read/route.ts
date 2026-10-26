import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const paramsSchema = z.object({ id: z.string().min(1).max(100) });

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = paramsSchema.parse(await params);
    const readAt = new Date();
    const updated = await prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt },
    });

    if (updated.count > 0) return NextResponse.json({ ok: true, readAt });

    const existing = await prisma.notification.findFirst({
      where: { id, userId },
      select: { readAt: true },
    });
    if (!existing)
      throw new AppError("Notificação não encontrada.", 404, "NOT_FOUND");
    return NextResponse.json({ ok: true, readAt: existing.readAt });
  } catch (error) {
    return errorResponse(error);
  }
}
