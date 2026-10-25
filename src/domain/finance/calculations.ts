/**
 * Regras financeiras CENTRALIZADAS. Nenhum componente ou rota deve recalcular isto.
 *
 * Duas visões, mantidas separadas para evitar dupla contagem:
 *  - COMPETÊNCIA (resultado): receitas recebidas e despesas reconhecidas.
 *    Compra no cartão conta na data da compra; o pagamento da fatura NÃO conta.
 *  - CAIXA (saldos): só o que efetivamente movimentou uma conta (status PAID com accountId).
 *    Compra no cartão não mexe no saldo; o pagamento da fatura mexe.
 * Transferências afetam contas individuais, mas nunca receita/despesa nem o consolidado.
 */
import { D, round2, sum, Decimal } from "./money";
import type { DateRange, TxLike } from "./types";

const inRange = (d: Date | null | undefined, r: DateRange) => !!d && d >= r.start && d <= r.end;
const alive = (t: TxLike) => !t.deletedAt && t.status !== "CANCELLED";

/** Receitas efetivamente recebidas no período (data de recebimento). */
export function incomeReceived(txs: TxLike[], range: DateRange): Decimal {
  return sum(txs.filter((t) => alive(t) && t.type === "INCOME" && t.status === "PAID" && inRange(t.paidAt, range)).map((t) => t.amount));
}

/**
 * Despesas reconhecidas no período.
 *  - Compra no cartão: pela data da compra (mesmo antes de pagar a fatura).
 *  - Demais despesas: somente se PAID, pela data de pagamento.
 *  - Pagamento de fatura: excluído (já contado nas compras).
 */
export function expensesRecognized(txs: TxLike[], range: DateRange): Decimal {
  return sum(
    txs
      .filter((t) => {
        if (!alive(t) || t.type !== "EXPENSE" || t.isInvoicePayment) return false;
        if (t.creditCardId) return inRange(t.transactionDate, range);
        return t.status === "PAID" && inRange(t.paidAt, range);
      })
      .map((t) => t.amount),
  );
}

export const realizedResult = (txs: TxLike[], range: DateRange): Decimal =>
  incomeReceived(txs, range).minus(expensesRecognized(txs, range));

/** Efeito de uma transação no saldo (caixa) de uma conta. */
function cashEffect(t: TxLike): Decimal {
  const a = D(t.amount);
  if (t.type === "INCOME") return a;
  if (t.type === "EXPENSE") return a.negated();
  return t.transferDirection === "IN" ? a : a.negated();
}

const movesCash = (t: TxLike) => alive(t) && t.status === "PAID" && !!t.accountId;

/** Saldo atual = saldo inicial + movimentações efetivas posteriores à data de referência. */
export function accountBalance(initialBalance: Decimal.Value, accountId: string, txs: TxLike[], balanceDate?: Date, upTo?: Date): Decimal {
  const moves = txs.filter((t) => movesCash(t) && t.accountId === accountId && (!balanceDate || (t.paidAt && t.paidAt >= balanceDate)) && (!upTo || (t.paidAt && t.paidAt <= upTo)));
  return round2(D(initialBalance).plus(sum(moves.map(cashEffect))));
}

/** Saldo consolidado: transferências se anulam, então são ignoradas na soma. */
export function consolidatedBalance(accounts: { id: string; initialBalance: Decimal.Value; balanceDate?: Date }[], txs: TxLike[]): Decimal {
  return round2(sum(accounts.map((a) => accountBalance(a.initialBalance, a.id, txs.filter((t) => t.type !== "TRANSFER"), a.balanceDate))));
}

/** Obrigações pendentes (despesas PENDING que ainda não saíram do caixa, exceto compras de cartão — essas vão para a fatura). */
export function pendingPayables(txs: TxLike[], range?: DateRange): Decimal {
  return sum(txs.filter((t) => alive(t) && t.type === "EXPENSE" && t.status === "PENDING" && !t.creditCardId && (!range || inRange(t.dueDate ?? t.transactionDate, range))).map((t) => t.amount));
}

export function overduePayables(txs: TxLike[], today: Date): Decimal {
  return sum(txs.filter((t) => alive(t) && t.type === "EXPENSE" && t.status === "PENDING" && !t.creditCardId && t.dueDate && t.dueDate < today).map((t) => t.amount));
}

export function pendingIncome(txs: TxLike[], range: DateRange): Decimal {
  return sum(txs.filter((t) => alive(t) && t.type === "INCOME" && t.status === "PENDING" && inRange(t.dueDate ?? t.transactionDate, range)).map((t) => t.amount));
}

/** Saldo projetado = saldo atual + entradas futuras previstas − saídas futuras previstas (apenas o que ainda não está no saldo). */
export function projectedBalance(currentBalance: Decimal.Value, futureIncome: Decimal.Value, futureOutflow: Decimal.Value): Decimal {
  return round2(D(currentBalance).plus(D(futureIncome)).minus(D(futureOutflow)));
}

/** Taxa de economia (%) ou null quando não há receita (indicador indisponível). */
export function savingsRate(income: Decimal.Value, result: Decimal.Value): Decimal | null {
  const i = D(income);
  return i.isZero() ? null : round2(D(result).div(i).times(100));
}

/** % da renda comprometida = obrigações / renda de referência; null se renda zero. */
export function committedIncomePercent(obligations: Decimal.Value, referenceIncome: Decimal.Value): Decimal | null {
  const r = D(referenceIncome);
  return r.isZero() ? null : round2(D(obligations).div(r).times(100));
}

/** % da meta; null (inválida) se alvo <= 0. */
export function goalPercent(accumulated: Decimal.Value, target: Decimal.Value): Decimal | null {
  const t = D(target);
  return t.lte(0) ? null : round2(D(accumulated).div(t).times(100));
}

export function creditAvailable(limit: Decimal.Value, usedOpenAmount: Decimal.Value): Decimal {
  return round2(D(limit).minus(D(usedOpenAmount)));
}

export function budgetRemaining(limit: Decimal.Value, spent: Decimal.Value): { remaining: Decimal; percentUsed: Decimal | null } {
  const l = D(limit);
  return { remaining: round2(l.minus(D(spent))), percentUsed: l.isZero() ? null : round2(D(spent).div(l).times(100)) };
}

/** Despesas por categoria (competência), excluindo transferências e pagamento de fatura. */
export function expensesByCategory(txs: TxLike[], range: DateRange): Map<string, Decimal> {
  const map = new Map<string, Decimal>();
  for (const t of txs) {
    if (!alive(t) || t.type !== "EXPENSE" || t.isInvoicePayment) continue;
    const counted = t.creditCardId ? inRange(t.transactionDate, range) : t.status === "PAID" && inRange(t.paidAt, range);
    if (!counted) continue;
    const key = t.categoryId ?? "sem-categoria";
    map.set(key, (map.get(key) ?? D(0)).plus(D(t.amount)));
  }
  return map;
}
