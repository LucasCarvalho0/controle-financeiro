import { prisma } from "@/lib/prisma";

export const DEFAULT_CATEGORIES: { name: string; type: "INCOME" | "EXPENSE"; color: string }[] = [
  ...["Moradia", "Mercado", "Alimentação", "Transporte", "Combustível", "Saúde", "Educação", "Lazer", "Roupas", "Eletrônicos", "Assinaturas", "Contas domésticas", "Impostos e taxas", "Dívidas", "Investimentos e reservas", "Outros"].map((name) => ({ name, type: "EXPENSE" as const, color: "#ef4444" })),
  ...["Salário", "Horas extras", "Benefícios", "Renda extra", "Reembolsos", "Rendimentos", "Outras receitas"].map((name) => ({ name, type: "INCOME" as const, color: "#16a34a" })),
];

export async function ensureDefaultCategories(userId: string) {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId, isDefault: true })),
    skipDuplicates: true,
  });
}
