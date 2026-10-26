import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runDueReminderJob,
  type DueTransaction,
} from "@/server/services/due-notifications";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_SIZE = 100;

function hasValidSecret(request: Request, expectedSecret: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) return false;

  const provided = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(expectedSecret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    console.error("[notifications cron] CRON_SECRET is missing or too short");
    return NextResponse.json(
      { success: false, error: "CRON_NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  if (!hasValidSecret(request, secret)) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const result = await runDueReminderJob(
    {
      async findBatch(cursorId, limit) {
        const rows = await prisma.transaction.findMany({
          where: {
            type: "EXPENSE",
            status: "PENDING",
            dueDate: { not: null },
            deletedAt: null,
            id: cursorId ? { gt: cursorId } : undefined,
          },
          orderBy: { id: "asc" },
          take: limit,
          select: {
            id: true,
            userId: true,
            type: true,
            status: true,
            description: true,
            amount: true,
            dueDate: true,
            deletedAt: true,
            user: { select: { timezone: true, currency: true } },
          },
        });
        return rows as DueTransaction[];
      },
      createNotification(input) {
        return prisma.notification.create({ data: input });
      },
    },
    new Date(),
    BATCH_SIZE,
  );

  const success = result.errors === 0;
  return NextResponse.json(
    { success, partial: !success && result.created > 0, ...result },
    { status: success ? 200 : 207 },
  );
}
