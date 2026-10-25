import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError, errorResponse, notFound } from "@/lib/errors";
import { requireUserId } from "@/lib/session";
import { updateAccountSchema } from "@/server/validators/transaction";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = paramsSchema.parse(await params);
    const input = updateAccountSchema.parse(await req.json());

    const account = await prisma.financialAccount.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!account) throw notFound("Conta");

    const duplicate = await prisma.financialAccount.findFirst({
      where: {
        userId,
        id: { not: id },
        name: { equals: input.name, mode: "insensitive" },
        isActive: true,
      },
    });
    if (duplicate) {
      throw new AppError(
        "Já existe uma conta com este nome.",
        409,
        "DUPLICATE_ACCOUNT",
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.financialAccount.update({
        where: { id },
        data: {
          name: input.name,
          type: input.type,
          initialBalance: input.initialBalance,
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          entityType: "FinancialAccount",
          entityId: id,
          action: "UPDATE",
          metadata: { fields: Object.keys(input) },
        },
      });
      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
