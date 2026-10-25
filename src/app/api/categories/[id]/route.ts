import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError, errorResponse, notFound } from "@/lib/errors";
import { requireUserId } from "@/lib/session";

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(50, "Máximo de 50 caracteres").optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").optional(),
  icon: z.string().max(50).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const input = updateCategorySchema.parse(await req.json());

    const category = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) throw notFound("Categoria");

    // Se estiver mudando o nome, checar se não conflita com outra do mesmo tipo
    if (input.name && input.name !== category.name) {
      const type = input.type ?? category.type;
      const conflict = await prisma.category.findFirst({
        where: {
          userId,
          name: { equals: input.name, mode: "insensitive" },
          type,
          id: { not: id },
          isActive: true,
        },
      });
      if (conflict) {
        throw new AppError("Já existe uma categoria com este nome neste tipo.", 409, "DUPLICATE_CATEGORY");
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        type: input.type ?? undefined,
        color: input.color ?? undefined,
        icon: input.icon !== undefined ? input.icon : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const category = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) throw notFound("Categoria");

    // Verificar se tem transações vinculadas
    const count = await prisma.transaction.count({
      where: { categoryId: id, deletedAt: null },
    });

    if (count > 0) {
      // Se houver transações vinculadas, desativa para preservar o histórico financeiro
      await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ ok: true, archived: true, message: "Categoria arquivada porque possui lançamentos vinculados." });
    }

    // Se não tiver transações, pode deletar de verdade
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, deleted: true, message: "Categoria excluída com sucesso." });
  } catch (e) {
    return errorResponse(e);
  }
}
