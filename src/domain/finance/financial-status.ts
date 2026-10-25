import { D, Decimal } from "./money";

export interface StatusThresholds {
  /** Saldo projetado abaixo disto (em R$) => ATENÇÃO. Padrão 0 + margem. */
  attentionMargin: Decimal.Value;
  /** % da renda comprometida a partir do qual é ATENÇÃO. */
  attentionCommittedPercent: number;
  /** % da renda comprometida a partir do qual é CRÍTICA. */
  criticalCommittedPercent: number;
}

export const DEFAULT_THRESHOLDS: StatusThresholds = {
  attentionMargin: 200,
  attentionCommittedPercent: 70,
  criticalCommittedPercent: 100,
};

export type FinancialStatus = "CONTROLADA" | "ATENCAO" | "CRITICA";

export interface StatusResult { status: FinancialStatus; reasons: string[] }

/** Critérios explícitos e retornados junto com o resultado (nada oculto). */
export function financialStatus(
  input: { projectedBalance: Decimal.Value; overdue: Decimal.Value; committedPercent: Decimal.Value | null },
  th: StatusThresholds = DEFAULT_THRESHOLDS,
): StatusResult {
  const reasons: string[] = [];
  const proj = D(input.projectedBalance);
  let level = 0;
  if (proj.isNegative()) { level = 2; reasons.push("Saldo projetado negativo."); }
  else if (proj.lt(D(th.attentionMargin))) { level = Math.max(level, 1); reasons.push("Saldo projetado abaixo da margem configurada."); }
  if (D(input.overdue).gt(0)) { level = 2; reasons.push("Existem contas vencidas não pagas."); }
  if (input.committedPercent !== null) {
    const c = D(input.committedPercent);
    if (c.gte(th.criticalCommittedPercent)) { level = 2; reasons.push("Renda comprometida no limite crítico."); }
    else if (c.gte(th.attentionCommittedPercent)) { level = Math.max(level, 1); reasons.push("Renda comprometida acima do limite de atenção."); }
  }
  return { status: (["CONTROLADA", "ATENCAO", "CRITICA"] as const)[level]!, reasons };
}
