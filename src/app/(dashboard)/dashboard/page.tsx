import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDashboard } from "@/server/services/dashboard";
import { resolvePeriod, formatDateBR, type PeriodKey } from "@/lib/dates";
import { formatBRL } from "@/lib/currency";
import { CategoryChart } from "@/components/dashboard/category-chart";

const periods: { key: PeriodKey; label: string }[] = [
  { key: "mes-atual", label: "Mês atual" },
  { key: "mes-anterior", label: "Mês anterior" },
  { key: "ano-atual", label: "Ano atual" },
];
const statusUi = {
  CONTROLADA: { label: "Controlada", icon: "✔", cls: "bg-green-50 text-green-800 border-green-300" },
  ATENCAO: { label: "Atenção", icon: "▲", cls: "bg-amber-50 text-amber-800 border-amber-300" },
  CRITICA: { label: "Crítica", icon: "✖", cls: "bg-red-50 text-red-800 border-red-300" },
} as const;

function Stat({ title, value, tone, hint }: { title: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500">{title}</p>
      <p className={`mt-1 text-xl font-semibold ${tone ?? ""}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const session = await auth();
  const { periodo } = await searchParams;
  const key = (periods.find((p) => p.key === periodo)?.key ?? "mes-atual") as PeriodKey;
  const range = resolvePeriod(key);
  const d = await getDashboard(session!.user.id, range);
  const st = statusUi[d.status.status];
  const pct = (v: string | null) => (v === null ? "Indisponível" : `${v}%`);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-xs text-slate-500">{formatDateBR(range.start)} a {formatDateBR(range.end)}</p>
        </div>
        <nav className="flex gap-2" aria-label="Período">
          {periods.map((p) => (
            <Link key={p.key} href={`/dashboard?periodo=${p.key}`} className={`btn-ghost ${p.key === key ? "bg-blue-50 border-blue-400" : ""}`}>{p.label}</Link>
          ))}
        </nav>
      </header>

      <section className={`card border ${st.cls}`}>
        <p className="font-medium">{st.icon} Situação financeira: {st.label}</p>
        {d.status.reasons.length > 0 ? (
          <ul className="mt-1 list-disc pl-5 text-sm">{d.status.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        ) : <p className="mt-1 text-sm">Nenhum critério de alerta foi atingido.</p>}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat title="Saldo atual (caixa)" value={formatBRL(d.currentBalance)} />
        <Stat title="Receitas recebidas" value={formatBRL(d.incomeReceived)} tone="text-green-700" />
        <Stat title="Despesas do período" value={formatBRL(d.expensesRecognized)} tone="text-red-700" />
        <Stat title="Resultado realizado" value={formatBRL(d.realizedResult)} tone={Number(d.realizedResult) >= 0 ? "text-green-700" : "text-red-700"} />
        <Stat title="Contas a pagar" value={formatBRL(d.pendingPayables)} tone="text-amber-700" />
        <Stat title="Contas vencidas" value={formatBRL(d.overduePayables)} tone={Number(d.overduePayables) > 0 ? "text-red-700" : ""} />
        <Stat title="Saldo projetado (fim do mês)" value={formatBRL(d.projectedBalanceEndOfMonth)} hint="Estimativa" />
        <Stat title="Taxa de economia" value={pct(d.savingsRate)} hint={`Renda comprometida: ${pct(d.committedIncomePercent)}`} />
      </section>

      <section className="card">
        <h2 className="mb-2 font-medium">Gastos por categoria</h2>
        <CategoryChart data={d.expensesByCategory} />
      </section>

      <details className="card text-sm">
        <summary className="cursor-pointer font-medium">Como esses números são calculados</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{Object.values(d.methodology).map((m) => <li key={m}>{m}</li>)}</ul>
      </details>
    </div>
  );
}
