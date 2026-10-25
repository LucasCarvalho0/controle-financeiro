import { z } from "zod";

const money = z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, "Valor inválido").refine((v) => Number(v) > 0, "O valor deve ser maior que zero");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const createTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().trim().min(1).max(160),
  amount: money,
  categoryId: z.string().min(1).optional(),
  accountId: z.string().min(1),
  transactionDate: isoDate,
  dueDate: isoDate.optional(),
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  paidAt: isoDate.optional(),
  paymentMethod: z.enum(["PIX", "DEBIT", "CASH", "BANK_SLIP", "TRANSFER", "OTHER"]).optional(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(8).max(100).optional(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z.object({
  description: z.string().trim().min(1).max(160).optional(),
  amount: money.optional(),
  categoryId: z.string().nullable().optional(),
  accountId: z.string().min(1).optional(),
  transactionDate: isoDate.optional(),
  dueDate: isoDate.nullable().optional(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
  paidAt: isoDate.nullable().optional(),
  paymentMethod: z.enum(["PIX", "DEBIT", "CREDIT_CARD", "CASH", "BANK_SLIP", "TRANSFER", "OTHER"]).optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const listTransactionsSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  q: z.string().max(100).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const accountSchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(["CHECKING", "DIGITAL", "CASH", "SAVINGS", "WALLET", "OTHER"]).default("CHECKING"),
  initialBalance: z.string().regex(/^-?\d{1,12}(\.\d{1,2})?$/, "Valor inválido").default("0"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("E-mail inválido").transform((e) => e.toLowerCase()),
  cpf: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(128),
});
