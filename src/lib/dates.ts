import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths } from "date-fns";

export type PeriodKey = "mes-atual" | "mes-anterior" | "ano-atual" | "personalizado";

export function resolvePeriod(key: PeriodKey, from?: string, to?: string, now = new Date()) {
  switch (key) {
    case "mes-anterior": { const p = subMonths(now, 1); return { start: startOfMonth(p), end: endOfMonth(p) }; }
    case "ano-atual": return { start: startOfYear(now), end: endOfYear(now) };
    case "personalizado": {
      const s = from ? new Date(from + "T00:00:00") : startOfMonth(now);
      const e = to ? new Date(to + "T23:59:59") : endOfMonth(now);
      return { start: s, end: e };
    }
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export const formatDateBR = (d: Date | string | null | undefined) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");
