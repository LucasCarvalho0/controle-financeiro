import type Decimal from "decimal.js";

export type TxType = "INCOME" | "EXPENSE" | "TRANSFER";
export type TxStatus = "PENDING" | "PAID" | "CANCELLED";

/** Forma mínima de uma transação usada pelo domínio (independente do Prisma). */
export interface TxLike {
  type: TxType;
  status: TxStatus;
  amount: Decimal.Value; // sempre positivo
  accountId?: string | null;
  categoryId?: string | null;
  transferDirection?: "IN" | "OUT" | null;
  isInvoicePayment?: boolean;
  creditCardId?: string | null;
  transactionDate: Date; // competência
  dueDate?: Date | null;
  paidAt?: Date | null;
  deletedAt?: Date | null;
}

export interface DateRange { start: Date; end: Date } // inclusivo
