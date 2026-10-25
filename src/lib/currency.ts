const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBRL = (v: string | number | null | undefined) => fmt.format(Number(v ?? 0));

/** Converte "1.234,56" ou "1234.56" em string decimal segura "1234.56". Retorna null se inválido. */
export function parseMoneyInput(raw: string): string | null {
  const s = raw.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? normalized : null;
}
