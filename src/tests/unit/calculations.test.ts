import { describe, expect, it } from "vitest";
import {
  accountBalance, budgetRemaining, committedIncomePercent, consolidatedBalance, expensesByCategory,
  expensesRecognized, goalPercent, incomeReceived, projectedBalance, realizedResult, savingsRate,
} from "@/domain/finance/calculations";
import { financialStatus } from "@/domain/finance/financial-status";
import type { TxLike } from "@/domain/finance/types";

const d = (s: string) => new Date(s + "T12:00:00Z");
const range = { start: d("2026-10-01"), end: d("2026-10-31") };
const base = { status: "PAID" as const, transactionDate: d("2026-10-05"), paidAt: d("2026-10-05") };

describe("receitas e despesas", () => {
  it("soma receita recebida uma única vez e ignora pendentes/canceladas", () => {
    const txs: TxLike[] = [
      { ...base, type: "INCOME", amount: "3000.10", accountId: "a" },
      { ...base, type: "INCOME", amount: 500, status: "PENDING", paidAt: null, accountId: "a" },
      { ...base, type: "INCOME", amount: 999, status: "CANCELLED", accountId: "a" },
    ];
    expect(incomeReceived(txs, range).toString()).toBe("3000.1");
  });

  it("despesa paga afeta o saldo uma vez; pendente não desconta do saldo efetivo", () => {
    const txs: TxLike[] = [
      { ...base, type: "EXPENSE", amount: 100, accountId: "a" },
      { ...base, type: "EXPENSE", amount: 250, status: "PENDING", paidAt: null, dueDate: d("2026-10-20"), accountId: "a" },
    ];
    expect(accountBalance(1000, "a", txs).toString()).toBe("900");
  });

  it("evita ponto flutuante (0.1 + 0.2)", () => {
    const txs: TxLike[] = [
      { ...base, type: "INCOME", amount: "0.1", accountId: "a" },
      { ...base, type: "INCOME", amount: "0.2", accountId: "a" },
    ];
    expect(incomeReceived(txs, range).toString()).toBe("0.3");
  });
});

describe("transferências", () => {
  const txs: TxLike[] = [
    { ...base, type: "TRANSFER", transferDirection: "OUT", amount: 300, accountId: "a" },
    { ...base, type: "TRANSFER", transferDirection: "IN", amount: 300, accountId: "b" },
  ];
  it("movem saldos individuais", () => {
    expect(accountBalance(1000, "a", txs).toString()).toBe("700");
    expect(accountBalance(0, "b", txs).toString()).toBe("300");
  });
  it("não geram receita nem despesa e não alteram o consolidado", () => {
    expect(incomeReceived(txs, range).toString()).toBe("0");
    expect(expensesRecognized(txs, range).toString()).toBe("0");
    expect(consolidatedBalance([{ id: "a", initialBalance: 1000 }, { id: "b", initialBalance: 0 }], txs).toString()).toBe("1000");
  });
});

describe("cartão de crédito sem dupla contagem", () => {
  const purchase: TxLike = { type: "EXPENSE", status: "PENDING", amount: 400, creditCardId: "c", accountId: null, transactionDate: d("2026-10-10"), paidAt: null };
  const invoicePayment: TxLike = { type: "EXPENSE", status: "PAID", amount: 400, isInvoicePayment: true, accountId: "a", transactionDate: d("2026-10-25"), paidAt: d("2026-10-25") };
  it("compra conta no resultado na data da compra e não mexe no saldo", () => {
    expect(expensesRecognized([purchase], range).toString()).toBe("400");
    expect(accountBalance(1000, "a", [purchase]).toString()).toBe("1000");
  });
  it("pagamento da fatura mexe no caixa mas não duplica o resultado", () => {
    const all = [purchase, invoicePayment];
    expect(expensesRecognized(all, range).toString()).toBe("400");
    expect(accountBalance(1000, "a", all).toString()).toBe("600");
  });
  it("categoria não duplica compra + fatura", () => {
    const m = expensesByCategory([{ ...purchase, categoryId: "x" }, { ...invoicePayment, categoryId: "x" }], range);
    expect(m.get("x")?.toString()).toBe("400");
  });
});

describe("indicadores", () => {
  it("resultado realizado", () => {
    const txs: TxLike[] = [
      { ...base, type: "INCOME", amount: 5000, accountId: "a" },
      { ...base, type: "EXPENSE", amount: 3500, accountId: "a" },
    ];
    expect(realizedResult(txs, range).toString()).toBe("1500");
    expect(savingsRate(5000, 1500)?.toString()).toBe("30");
  });
  it("divisão por zero vira indisponível (null)", () => {
    expect(savingsRate(0, 100)).toBeNull();
    expect(committedIncomePercent(100, 0)).toBeNull();
    expect(goalPercent(10, 0)).toBeNull();
  });
  it("saldo projetado, meta e orçamento", () => {
    expect(projectedBalance(1000, 500, 800).toString()).toBe("700");
    expect(goalPercent(250, 1000)?.toString()).toBe("25");
    const b = budgetRemaining(600, 450);
    expect(b.remaining.toString()).toBe("150");
    expect(b.percentUsed?.toString()).toBe("75");
  });
  it("situação financeira explica os motivos", () => {
    expect(financialStatus({ projectedBalance: 5000, overdue: 0, committedPercent: 30 }).status).toBe("CONTROLADA");
    expect(financialStatus({ projectedBalance: 100, overdue: 0, committedPercent: 30 }).status).toBe("ATENCAO");
    const c = financialStatus({ projectedBalance: -1, overdue: 0, committedPercent: 30 });
    expect(c.status).toBe("CRITICA");
    expect(c.reasons.length).toBeGreaterThan(0);
  });
});
