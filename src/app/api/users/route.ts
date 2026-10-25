import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { isUserAdmin } from "@/lib/admin";
import { registerSchema } from "@/server/validators/transaction";
import { ensureDefaultCategories } from "@/server/services/default-categories";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isUserAdmin(session.user.email)) {
      throw new AppError("Acesso restrito ao administrador.", 403, "FORBIDDEN");
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
            financialAccounts: true,
            categories: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isUserAdmin(session.user.email)) {
      throw new AppError("Acesso restrito ao administrador.", 403, "FORBIDDEN");
    }

    const input = registerSchema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError("Já existe um usuário cadastrado com este e-mail.", 409, "USER_EXISTS");
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    // Cria as categorias padrão para a nova pessoa
    await ensureDefaultCategories(user.id);

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
