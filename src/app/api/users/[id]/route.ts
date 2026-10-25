import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AppError, errorResponse, notFound } from "@/lib/errors";
import { isUserAdmin } from "@/lib/admin";

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(128).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isUserAdmin(session.user.email)) {
      throw new AppError("Acesso restrito ao administrador.", 403, "FORBIDDEN");
    }

    const { id } = await params;
    const input = updateUserSchema.parse(await req.json());

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw notFound("Usuário");

    const data: { name?: string; passwordHash?: string } = {};
    if (input.name) data.name = input.name;
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, 12);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isUserAdmin(session.user.email)) {
      throw new AppError("Acesso restrito ao administrador.", 403, "FORBIDDEN");
    }

    const { id } = await params;

    // Não permitir que o administrador exclua a própria conta
    if (id === session.user.id) {
      throw new AppError("O administrador não pode excluir a sua própria conta.", 400, "CANNOT_DELETE_SELF");
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw notFound("Usuário");

    if (isUserAdmin(targetUser.email)) {
      throw new AppError("Não é permitido excluir outro administrador.", 400, "CANNOT_DELETE_ADMIN");
    }

    // Exclui em cascata o usuário e seus dados associados
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true, message: "Usuário removido com sucesso." });
  } catch (e) {
    return errorResponse(e);
  }
}
