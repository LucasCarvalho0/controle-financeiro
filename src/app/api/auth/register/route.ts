import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/server/validators/transaction";
import { ensureDefaultCategories } from "@/server/services/default-categories";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!rateLimit(`register:${ip}`, 10, 60 * 60_000)) {
      return NextResponse.json({ error: { code: "RATE_LIMIT", message: "Muitas tentativas. Tente mais tarde." } }, { status: 429 });
    }

    const input = registerSchema.parse(await req.json());
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) {
      return NextResponse.json({ error: { code: "REGISTER_FAILED", message: "Este e-mail já está em uso." } }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        cpf: input.cpf || null,
        phone: input.phone || null,
      },
    });

    await ensureDefaultCategories(user.id);

    // Sincronização opcional com Firebase Auth
    try {
      if (adminAuth) {
        await adminAuth.createUser({
          uid: user.id,
          email: input.email,
          password: input.password,
          displayName: input.name,
        });
      }
    } catch (fbErr) {
      // Se já existir no Firebase ou houver falha de rede, não trava o cadastro no sistema principal
      console.warn("Aviso Firebase Auth Sync:", fbErr);
    }

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
