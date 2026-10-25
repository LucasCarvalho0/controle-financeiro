import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100).optional(),
  image: z.string().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  cpf: z.string().trim().nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new AppError("Não autenticado.", 401, "UNAUTHORIZED");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        cpf: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!user) throw new AppError("Usuário não encontrado.", 404, "NOT_FOUND");

    return NextResponse.json(user);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new AppError("Não autenticado.", 401, "UNAUTHORIZED");

    const body = await req.json();
    const input = updateProfileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.image !== undefined && { image: input.image }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.cpf !== undefined && { cpf: input.cpf }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        cpf: true,
        phone: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    return errorResponse(e);
  }
}
