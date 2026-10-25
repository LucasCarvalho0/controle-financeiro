import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import type { CreateTransactionInput, UpdateTransactionInput } from "../validators/transaction";
import { listTransactionsSchema } from "../validators/transaction";
import type { z } from "zod";

const at = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

export async function createTransaction(userId: string, input: CreateTransactionInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.transaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } } });
    if (existing) return existing; // repetição da mesma requisição: mesmo efeito, uma única vez
  }
  // Isolamento por usuário: conta e categoria precisam pertencer a quem está logado.
  const account = await prisma.financialAccount.findFirst({ where: { id: input.accountId, userId, isActive: true } });
  if (!account) throw new AppError("Conta inexistente ou inativa.", 422, "INVALID_ACCOUNT");
  if (input.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: input.categoryId, userId, isActive: true } });
    if (!cat) throw new AppError("Categoria inexistente.", 422, "INVALID_CATEGORY");
    if (cat.type !== input.type) throw new AppError("Categoria incompatível com o tipo da transação.", 422, "CATEGORY_TYPE_MISMATCH");
  }
  const paid = input.status === "PAID";
  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId, accountId: input.accountId, categoryId: input.categoryId, type: input.type,
          description: input.description, amount: input.amount,
          transactionDate: at(input.transactionDate),
          dueDate: input.dueDate ? at(input.dueDate) : undefined,
          status: input.status, paidAt: paid ? at(input.paidAt ?? input.transactionDate) : null,
          paymentMethod: input.paymentMethod, notes: input.notes, idempotencyKey: input.idempotencyKey,
        },
      });
      await tx.auditLog.create({ data: { userId, entityType: "Transaction", entityId: created.id, action: "CREATE", metadata: { type: input.type, amount: input.amount, status: input.status } } });
      return created;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && input.idempotencyKey) {
      const existing = await prisma.transaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } } });
      if (existing) return existing;
    }
    throw e;
  }
}

/** Marca como paga/recebida. Atômico e idempotente: só uma chamada concorrente tem efeito. */
export async function markPaid(userId: string, id: string, paidAt?: string) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.transaction.updateMany({
      where: { id, userId, status: "PENDING", deletedAt: null },
      data: { status: "PAID", paidAt: paidAt ? at(paidAt) : new Date() },
    });
    const current = await tx.transaction.findFirst({ where: { id, userId, deletedAt: null } });
    if (!current) throw notFound("Transação");
    if (res.count === 1) await tx.auditLog.create({ data: { userId, entityType: "Transaction", entityId: id, action: "PAY" } });
    else if (current.status === "CANCELLED") throw new AppError("Transação cancelada não pode ser paga.", 409, "CANCELLED");
    return current; // se já estava PAID, nada foi alterado
  });
}

export async function cancelTransaction(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.transaction.updateMany({ where: { id, userId, deletedAt: null, status: { not: "CANCELLED" } }, data: { status: "CANCELLED" } });
    if (res.count === 0) {
      const exists = await tx.transaction.findFirst({ where: { id, userId } });
      if (!exists) throw notFound("Transação");
    } else {
      await tx.auditLog.create({ data: { userId, entityType: "Transaction", entityId: id, action: "CANCEL" } });
    }
    return tx.transaction.findFirst({ where: { id, userId } });
  });
}

export async function markPending(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const res = await tx.transaction.updateMany({
      where: { id, userId, deletedAt: null },
      data: { status: "PENDING", paidAt: null },
    });
    const current = await tx.transaction.findFirst({ where: { id, userId, deletedAt: null } });
    if (!current) throw notFound("Transação");
    if (res.count === 1) await tx.auditLog.create({ data: { userId, entityType: "Transaction", entityId: id, action: "UNPAY" } });
    return current;
  });
}

export async function getTransaction(userId: string, id: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true, color: true, icon: true } },
      account: { select: { id: true, name: true, color: true } },
    },
  });
  if (!tx) throw notFound("Transação");
  return tx;
}

export async function updateTransaction(userId: string, id: string, input: UpdateTransactionInput) {
  const current = await prisma.transaction.findFirst({ where: { id, userId, deletedAt: null } });
  if (!current) throw notFound("Transação");

  if (input.accountId && input.accountId !== current.accountId) {
    const account = await prisma.financialAccount.findFirst({ where: { id: input.accountId, userId, isActive: true } });
    if (!account) throw new AppError("Conta inexistente ou inativa.", 422, "INVALID_ACCOUNT");
  }

  if (input.categoryId !== undefined) {
    if (input.categoryId !== null) {
      const cat = await prisma.category.findFirst({ where: { id: input.categoryId, userId, isActive: true } });
      if (!cat) throw new AppError("Categoria inexistente.", 422, "INVALID_CATEGORY");
      if (cat.type !== current.type) throw new AppError("Categoria incompatível com o tipo da transação.", 422, "CATEGORY_TYPE_MISMATCH");
    }
  }

  const newStatus = input.status ?? current.status;
  const isPaid = newStatus === "PAID";
  let paidAtValue: Date | null = current.paidAt;
  if (input.paidAt !== undefined) {
    paidAtValue = input.paidAt ? at(input.paidAt) : null;
  } else if (newStatus === "PAID" && !current.paidAt) {
    paidAtValue = new Date();
  } else if (newStatus !== "PAID") {
    paidAtValue = null;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.update({
      where: { id },
      data: {
        description: input.description ?? undefined,
        amount: input.amount ?? undefined,
        accountId: input.accountId ?? undefined,
        categoryId: input.categoryId !== undefined ? input.categoryId : undefined,
        transactionDate: input.transactionDate ? at(input.transactionDate) : undefined,
        dueDate: input.dueDate !== undefined ? (input.dueDate ? at(input.dueDate) : null) : undefined,
        status: newStatus,
        paidAt: paidAtValue,
        paymentMethod: input.paymentMethod ?? undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        account: { select: { id: true, name: true, color: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        entityType: "Transaction",
        entityId: id,
        action: "UPDATE",
        metadata: { changes: input },
      },
    });

    return updated;
  });
}

export async function listTransactions(userId: string, query: z.infer<typeof listTransactionsSchema>) {
  const where: Prisma.TransactionWhereInput = {
    userId, deletedAt: null,
    type: query.type ?? { in: ["INCOME", "EXPENSE"] },
    status: query.status, categoryId: query.categoryId, accountId: query.accountId,
    description: query.q ? { contains: query.q, mode: "insensitive" } : undefined,
    transactionDate: query.from || query.to ? { gte: query.from ? at(query.from) : undefined, lte: query.to ? at(query.to) : undefined } : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where, orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      include: { category: { select: { id: true, name: true, color: true, icon: true } }, account: { select: { id: true, name: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);
  return { items, total, page: query.page, pageSize: query.pageSize };
}
