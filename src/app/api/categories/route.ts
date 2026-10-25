import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError, errorResponse } from "@/lib/errors";
import { requireUserId } from "@/lib/session";

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(50, "Máximo de 50 caracteres"),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").default("#64748b"),
  icon: z.string().max(50).optional().nullable(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    return NextResponse.json(
      await prisma.category.findMany({
        where: { userId, isActive: true },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      })
    );
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const input = createCategorySchema.parse(await req.json());

    // Verifica se já existe categoria com esse nome e tipo para o usuário
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: { equals: input.name, mode: "insensitive" },
        type: input.type,
      },
    });

    if (existing) {
      if (!existing.isActive) {
        // Se já existia mas estava inativa, reativa e atualiza
        const reactivated = await prisma.category.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            color: input.color,
            icon: input.icon ?? undefined,
          },
        });
        return NextResponse.json(reactivated, { status: 200 });
      }
      throw new AppError("Já existe uma categoria com este nome neste tipo.", 409, "DUPLICATE_CATEGORY");
    }

    const created = await prisma.category.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        color: input.color,
        icon: input.icon ?? null,
        isActive: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
