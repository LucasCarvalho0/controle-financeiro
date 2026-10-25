// Seed SOMENTE para desenvolvimento. Nunca execute em produção.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "../src/server/services/default-categories";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed bloqueado em produção.");
  const user = await prisma.user.upsert({
    where: { email: "dev@exemplo.local" },
    update: {},
    create: { email: "dev@exemplo.local", name: "Usuário DEV (dados de teste)", passwordHash: await bcrypt.hash("Dev@12345", 12) },
  });
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name_type: { userId: user.id, name: c.name, type: c.type } },
      update: {},
      create: { ...c, userId: user.id, isDefault: true },
    });
  }
  await prisma.financialAccount.upsert({
    where: { userId_name: { userId: user.id, name: "Conta DEV" } },
    update: {},
    create: { userId: user.id, name: "Conta DEV", initialBalance: 1000 },
  });
  console.log("Seed DEV concluído: dev@exemplo.local / Dev@12345");
}
main().finally(() => prisma.$disconnect());
