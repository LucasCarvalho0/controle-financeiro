import { prisma } from "@/lib/prisma";
import {
  consolidatedBalance, committedIncomePercent, expensesByCategory, expensesRecognized, incomeReceived,
  overduePayables, pendingIncome, pendingPayables, projectedBalance, realizedResult, savingsRate,
} from "@/domain/finance/calculations";
import { financialStatus, DEFAULT_THRESHOLDS } from "@/domain/finance/financial-status";
import type { DateRange, TxLike } from "@/domain/finance/types";
import { endOfMonth, startOfDay } from "date-fns";

/**
 * Fase 2: carrega as transações do usuário e delega TODO o cálculo ao domínio.
 * Otimização futura: agregações SQL (groupBy) quando o volume crescer.
 */
export async function getDashboard(userId: string, range: DateRange, now = new Date()) {
  const [accounts, rows, categories] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId, isActive: true } }),
    prisma.transaction.findMany({ where: { userId, deletedAt: null } }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
  ]);
  const txs: TxLike[] = rows;

  const today = startOfDay(now);
  const currentBalance = consolidatedBalance(accounts.map((a) => ({ id: a.id, initialBalance: a.initialBalance, balanceDate: a.balanceDate })), txs);
  const futureRange: DateRange = { start: today, end: endOfMonth(now) };
  const futureOut = pendingPayables(txs, futureRange);
  const futureIn = pendingIncome(txs, futureRange);
  const projected = projectedBalance(currentBalance, futureIn, futureOut);
  const income = incomeReceived(txs, range);
  const expenses = expensesRecognized(txs, range);
  const result = realizedResult(txs, range);
  const overdue = overduePayables(txs, today);
  const pending = pendingPayables(txs);
  const committed = committedIncomePercent(pending.plus(expenses), income);
  const status = financialStatus({ projectedBalance: projected, overdue, committedPercent: committed }, DEFAULT_THRESHOLDS);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const byCategory = [...expensesByCategory(txs, range)].map(([id, v]) => ({ name: catMap.get(id)?.name ?? "Sem categoria", color: catMap.get(id)?.color ?? "#64748b", value: v.toFixed(2) })).sort((a, b) => Number(b.value) - Number(a.value));

  const s = (d: { toFixed: (n: number) => string } | null) => (d ? d.toFixed(2) : null);
  return {
    period: { start: range.start.toISOString(), end: range.end.toISOString() },
    currentBalance: s(currentBalance), incomeReceived: s(income), expensesRecognized: s(expenses), realizedResult: s(result),
    pendingPayables: s(pending), overduePayables: s(overdue), projectedBalanceEndOfMonth: s(projected),
    committedIncomePercent: s(committed), savingsRate: s(savingsRate(income, result)),
    status, expensesByCategory: byCategory,
    methodology: {
      resultado: "Competência: receitas recebidas − despesas reconhecidas (compras no cartão pela data da compra; pagamento de fatura e transferências não entram).",
      saldoAtual: "Caixa: saldo inicial + entradas pagas − saídas pagas por conta.",
      saldoProjetado: "Saldo atual + receitas pendentes − contas pendentes com vencimento até o fim do mês (estimativa).",
      rendaComprometida: "(contas pendentes + despesas do período) ÷ receitas recebidas no período. Indisponível se não houver receita.",
    },
  };
}
