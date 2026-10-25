import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { accountSchema } from "@/server/validators/transaction";

export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json(await prisma.financialAccount.findMany({ where: { userId }, orderBy: { name: "asc" } }));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = accountSchema.parse(await req.json());
    const created = await prisma.$transaction(async (tx) => {
      const acc = await tx.financialAccount.create({ data: { ...input, userId } });
      await tx.auditLog.create({ data: { userId, entityType: "FinancialAccount", entityId: acc.id, action: "CREATE" } });
      return acc;
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
