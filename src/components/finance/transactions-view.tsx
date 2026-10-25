"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { formatBRL, parseMoneyInput } from "@/lib/currency";
import { formatDateBR } from "@/lib/dates";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Pencil,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  DollarSign,
  Plus,
  Search,
  Filter,
  X,
  RotateCcw,
  ShieldCheck,
  Tag,
} from "lucide-react";

type Kind = "INCOME" | "EXPENSE";

interface Tx {
  id: string;
  description: string;
  amount: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  transactionDate: string;
  dueDate: string | null;
  paidAt?: string | null;
  notes?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  category?: {
    id?: string;
    name: string;
    color?: string;
    icon?: string | null;
  } | null;
  account?: { id?: string; name: string; color?: string } | null;
}

interface Opt {
  id: string;
  name: string;
  type?: string;
  color?: string;
  initialBalance?: string;
}

interface FormValues {
  description: string;
  amount: string;
  categoryId: string;
  accountId: string;
  transactionDate: string;
  dueDate: string;
  status: "PENDING" | "PAID";
  notes?: string;
}

interface EditFormValues {
  description: string;
  amount: string;
  categoryId: string;
  accountId: string;
  transactionDate: string;
  dueDate: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  notes?: string;
}

const L = {
  INCOME: {
    title: "Receitas",
    singular: "receita",
    pending: "Prevista",
    paid: "Recebida",
    payAction: "Marcar como recebida",
    unpayAction: "Marcar como prevista",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  EXPENSE: {
    title: "Despesas",
    singular: "despesa",
    pending: "Pendente",
    paid: "Paga",
    payAction: "Marcar como paga",
    unpayAction: "Marcar como pendente",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
} as const;

const today = () => new Date().toISOString().slice(0, 10);

export function TransactionsView({ kind }: { kind: Kind }) {
  const t = L[kind];
  const isExpense = kind === "EXPENSE";

  const [items, setItems] = useState<Tx[]>([]);
  const [allMonthTxs, setAllMonthTxs] = useState<{
    incomes: number;
    expenses: number;
    baseBalance: number;
  }>({
    incomes: 0,
    expenses: 0,
    baseBalance: 0,
  });
  const [accounts, setAccounts] = useState<Opt[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Modais de Visualização e Edição
  const [viewTx, setViewTx] = useState<Tx | null>(null);
  const [editTx, setEditTx] = useState<Tx | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Form de criação
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      status: "PENDING",
      transactionDate: today(),
      dueDate: today(),
    },
  });

  // Form de edição
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<EditFormValues>();

  // Carrega transações do tipo atual
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ type: kind });
      if (statusFilter) p.set("status", statusFilter);
      if (q) p.set("q", q);
      if (categoryFilter) p.set("categoryId", categoryFilter);
      const res = await fetch(`/api/transactions?${p}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch (e) {
      console.error("Erro ao carregar transações:", e);
    } finally {
      setLoading(false);
    }
  }, [kind, statusFilter, q, categoryFilter]);

  // Carrega resumo do mês e dashboard para o termômetro de saúde financeira
  const loadMonthSummary = useCallback(async () => {
    try {
      const [dashRes, accRes] = await Promise.all([
        fetch("/api/dashboard?periodo=mes-atual"),
        fetch("/api/accounts"),
      ]);

      let incomes = 0;
      let expenses = 0;
      let baseBalance = 0;

      if (dashRes.ok) {
        const d = await dashRes.json();
        incomes = Number(d.incomeReceived ?? 0);
        expenses = Number(d.expensesRecognized ?? 0);
      }

      if (accRes.ok) {
        const accs: Opt[] = await accRes.json();
        setAccounts(accs);
        baseBalance = accs.reduce(
          (sum, a) => sum + Number(a.initialBalance ?? 0),
          0,
        );
      }

      setAllMonthTxs({ incomes, expenses, baseBalance });
    } catch (e) {
      console.error("Erro ao carregar resumo:", e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadMonthSummary();
    void fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, [loadMonthSummary]);

  // Cálculos dinâmicos em tempo real
  const financialHealth = useMemo(() => {
    // Total das despesas listadas não canceladas
    const activeItems = items.filter((i) => i.status !== "CANCELLED");
    const totalList = activeItems.reduce((acc, i) => acc + Number(i.amount), 0);
    const paidList = activeItems
      .filter((i) => i.status === "PAID")
      .reduce((acc, i) => acc + Number(i.amount), 0);
    const pendingList = activeItems
      .filter((i) => i.status === "PENDING")
      .reduce((acc, i) => acc + Number(i.amount), 0);

    // Se for tela de Despesas:
    // O total de receitas do mês ou saldo inicial de caixa é a base.
    // Conforme o usuário adiciona despesa, o saldo restante diminui automaticamente!
    const incomeBase =
      allMonthTxs.incomes > 0 ? allMonthTxs.incomes : allMonthTxs.baseBalance;
    const currentExpenses = isExpense
      ? Math.max(totalList, allMonthTxs.expenses)
      : allMonthTxs.expenses;
    const currentIncomes = !isExpense
      ? Math.max(totalList, allMonthTxs.incomes)
      : allMonthTxs.incomes;

    // Saldo restante que vai diminuindo
    const remainingBalance =
      (incomeBase > 0 ? incomeBase : currentIncomes) - currentExpenses;

    // Percentual de comprometimento
    let percentage = 0;
    if (incomeBase > 0) {
      percentage = Math.round((currentExpenses / incomeBase) * 100);
    } else if (currentExpenses > 0) {
      percentage = 100;
    }

    // Diagnóstico da situação
    let statusLevel: "BOA" | "MODERADA" | "CRITICA" = "BOA";
    let statusTitle = "Situação Boa (Controlada)";
    let statusMessage =
      "Suas despesas estão sob controle e dentro da margem segura do mês!";
    let statusClass = "bg-emerald-50 border-emerald-300 text-emerald-900";
    let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
    let progressColor = "bg-emerald-500";

    if (percentage > 90 || remainingBalance < 0) {
      statusLevel = "CRITICA";
      statusTitle = "Situação Extremamente Crítica!";
      statusMessage =
        "Ó, tem que rever isso daí, sua situação tá extremamente crítica nesse mês!";
      statusClass = "bg-rose-50 border-rose-300 text-rose-950 shadow-sm";
      badgeClass = "bg-rose-100 text-rose-800 border-rose-300 animate-pulse";
      progressColor = "bg-rose-600";
    } else if (percentage >= 70) {
      statusLevel = "MODERADA";
      statusTitle = "Situação Moderada (Atenção)";
      statusMessage =
        "Atenção: seus gastos já atingiram a faixa de alerta. Evite despesas supérfluas!";
      statusClass = "bg-amber-50 border-amber-300 text-amber-950";
      badgeClass = "bg-amber-100 text-amber-800 border-amber-300";
      progressColor = "bg-amber-500";
    }

    return {
      totalList,
      paidList,
      pendingList,
      currentIncomes,
      currentExpenses,
      incomeBase,
      remainingBalance,
      percentage,
      statusLevel,
      statusTitle,
      statusMessage,
      statusClass,
      badgeClass,
      progressColor,
    };
  }, [items, allMonthTxs, isExpense]);

  // Criação de lançamento
  async function onSubmit(v: FormValues) {
    const amount = parseMoneyInput(v.amount);
    if (!amount)
      return setMsg({ ok: false, text: "Informe um valor numérico válido." });

    const body = {
      type: kind,
      description: v.description.trim(),
      amount,
      accountId: v.accountId,
      categoryId: v.categoryId || undefined,
      transactionDate: v.transactionDate,
      dueDate: v.dueDate || undefined,
      status: v.status,
      notes: v.notes?.trim() || undefined,
      idempotencyKey: crypto.randomUUID(),
    };

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMsg({
        ok: true,
        text: `Lançamento de ${t.singular} salvo com sucesso! O valor foi atualizado no saldo.`,
      });
      reset({
        status: "PENDING",
        transactionDate: today(),
        dueDate: today(),
        description: "",
        amount: "",
        notes: "",
      });
      void load();
      void loadMonthSummary();
    } else {
      const err = await res.json();
      setMsg({
        ok: false,
        text: err.error?.message ?? "Erro ao salvar lançamento.",
      });
    }
  }

  // Ações rápidas de status (pay, unpay, cancel)
  async function act(id: string, action: "pay" | "cancel" | "unpay") {
    if (
      action === "cancel" &&
      !confirm("Deseja realmente cancelar este lançamento?")
    )
      return;

    const res = await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      const texts = {
        pay: isExpense
          ? "Conta marcada como paga!"
          : "Receita marcada como recebida!",
        unpay: "Lançamento retornado para pendente.",
        cancel: "Lançamento cancelado.",
      };
      setMsg({ ok: true, text: texts[action] });
      void load();
      void loadMonthSummary();
      // Atualiza também o modal se estiver aberto
      if (viewTx && viewTx.id === id) {
        const newStatus =
          action === "pay"
            ? "PAID"
            : action === "unpay"
              ? "PENDING"
              : "CANCELLED";
        setViewTx({ ...viewTx, status: newStatus });
      }
    } else {
      setMsg({ ok: false, text: "Não foi possível atualizar a situação." });
    }
  }

  // Abre modal de edição
  function openEdit(tx: Tx) {
    setEditTx(tx);
    resetEdit({
      description: tx.description,
      amount: tx.amount,
      accountId: tx.accountId ?? tx.account?.id ?? "",
      categoryId: tx.categoryId ?? tx.category?.id ?? "",
      transactionDate: tx.transactionDate.slice(0, 10),
      dueDate: tx.dueDate ? tx.dueDate.slice(0, 10) : "",
      status: tx.status,
      notes: tx.notes ?? "",
    });
  }

  // Salva edição
  async function onSubmitEdit(v: EditFormValues) {
    if (!editTx) return;
    const amount = parseMoneyInput(v.amount);
    if (!amount) return alert("Informe um valor válido.");

    setEditLoading(true);
    try {
      const body = {
        description: v.description.trim(),
        amount,
        accountId: v.accountId,
        categoryId: v.categoryId || null,
        transactionDate: v.transactionDate,
        dueDate: v.dueDate || null,
        status: v.status,
        notes: v.notes?.trim() || null,
      };

      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMsg({ ok: true, text: "Lançamento atualizado com sucesso!" });
        setEditTx(null);
        void load();
        void loadMonthSummary();
        if (viewTx && viewTx.id === editTx.id) {
          const updated = await res.json();
          setViewTx(updated);
        }
      } else {
        const err = await res.json();
        alert(err.error?.message ?? "Erro ao salvar alterações.");
      }
    } catch {
      alert("Erro na conexão ao salvar alterações.");
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl flex items-center gap-2">
            {isExpense ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <TrendingDown className="h-5 w-5" />
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </span>
            )}
            Gestão de {t.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isExpense
              ? "Cadastre suas despesas, acompanhe a saúde financeira e veja o saldo diminuindo automaticamente."
              : "Cadastre suas receitas e entradas financeiras do mês."}
          </p>
        </div>
      </div>

      {/* FEEDBACK MSG */}
      {msg && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all ${
            msg.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {msg.ok ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            )}
            {msg.text}
          </span>
          <button
            onClick={() => setMsg(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TERMÔMETRO & DIAGNÓSTICO DE SAÚDE FINANCEIRA DO MÊS (Pedido pelo usuário) */}
      {/* ========================================================================= */}
      <section
        className={`rounded-xl border p-5 transition-all ${financialHealth.statusClass}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${financialHealth.badgeClass}`}
              >
                {financialHealth.statusLevel === "CRITICA" && (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {financialHealth.statusLevel === "MODERADA" && (
                  <AlertCircle className="h-4 w-4" />
                )}
                {financialHealth.statusLevel === "BOA" && (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {financialHealth.statusTitle}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {financialHealth.percentage}% da renda comprometida
              </span>
            </div>

            <p className="text-base font-semibold sm:text-lg text-slate-900 mt-2">
              {financialHealth.statusMessage}
            </p>

            <p className="text-xs text-slate-600">
              {isExpense ? (
                financialHealth.remainingBalance >= 0 ? (
                  <>
                    Você ainda tem{" "}
                    <strong>
                      {formatBRL(financialHealth.remainingBalance)}
                    </strong>{" "}
                    de saldo disponível neste mês. A cada nova despesa lançada,
                    este valor diminui automaticamente.
                  </>
                ) : (
                  <>
                    Suas despesas ultrapassaram suas receitas em{" "}
                    <strong>
                      {formatBRL(Math.abs(financialHealth.remainingBalance))}
                    </strong>
                    . Seu saldo está negativo!
                  </>
                )
              ) : (
                <>
                  Total de receitas registradas:{" "}
                  <strong>{formatBRL(financialHealth.totalList)}</strong>.
                </>
              )}
            </p>
          </div>

          {/* Saldo Restante em Destaque Visual */}
          <div className="rounded-xl bg-white/90 p-4 shadow-sm border border-slate-200/80 min-w-[220px] text-right sm:text-left">
            <p className="text-xs font-medium text-slate-500 flex items-center justify-end sm:justify-start gap-1">
              <Wallet className="h-3.5 w-3.5 text-blue-600" />
              Saldo Restante Disponível
            </p>
            <p
              className={`mt-1 text-2xl font-black tracking-tight ${
                financialHealth.remainingBalance >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {formatBRL(financialHealth.remainingBalance)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Diminui a cada lançamento efetuado
            </p>
          </div>
        </div>

        {/* Barra de Progresso Visual do Comprometimento */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
            <span>Despesas: {formatBRL(financialHealth.currentExpenses)}</span>
            <span>
              Renda Base:{" "}
              {formatBRL(
                financialHealth.incomeBase > 0
                  ? financialHealth.incomeBase
                  : financialHealth.currentIncomes,
              )}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/90">
            <div
              className={`h-full transition-all duration-500 rounded-full ${financialHealth.progressColor}`}
              style={{ width: `${Math.min(financialHealth.percentage, 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 4 CARDS DE MÉTRICAS RÁPIDAS */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card">
          <p className="text-xs font-medium text-slate-500">
            Total de Despesas Lançadas
          </p>
          <p className="mt-1 text-xl font-bold text-rose-600">
            {formatBRL(financialHealth.totalList)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {items.length} lançamento(s)
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium text-slate-500">Contas Já Pagas</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">
            {formatBRL(financialHealth.paidList)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Liquidadas</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium text-slate-500">
            Contas a Pagar (Pendentes)
          </p>
          <p className="mt-1 text-xl font-bold text-amber-600">
            {formatBRL(financialHealth.pendingList)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            A vencer ou em aberto
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium text-slate-500">
            Receitas Previstas no Mês
          </p>
          <p className="mt-1 text-xl font-bold text-blue-600">
            {formatBRL(financialHealth.currentIncomes)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Base para abatimento
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FORMULÁRIO DE NOVO LANÇAMENTO                                             */}
      {/* ========================================================================= */}
      <div className="card border-slate-200">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            Novo Lançamento de {t.title.slice(0, -1)}
          </h2>
          <span className="text-xs text-slate-500">
            Preencha os dados abaixo
          </span>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          noValidate
        >
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">
              Descrição
            </label>
            <input
              id="description"
              placeholder="Ex: Aluguel, Supermercado, Internet..."
              className="input font-medium"
              {...register("description", {
                required: "Informe a descrição do lançamento",
              })}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="amount">
              Valor (R$)
            </label>
            <div className="flex min-w-0 overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
              <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                R$
              </span>
              <input
                id="amount"
                inputMode="decimal"
                placeholder="0,00"
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-500"
                {...register("amount", { required: "Informe o valor" })}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="accountId">
              Conta Bancária / Carteira
            </label>
            <select
              id="accountId"
              className="input"
              {...register("accountId", { required: "Selecione a conta" })}
            >
              <option value="">Selecione uma conta…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                Cadastre uma conta em “Contas” primeiro.
              </p>
            )}
            {errors.accountId && (
              <p className="mt-1 text-xs text-red-600">
                {errors.accountId.message}
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="categoryId">
              Categoria
            </label>
            <select
              id="categoryId"
              className="input"
              {...register("categoryId")}
            >
              <option value="">Sem categoria</option>
              {categories
                .filter((c) => c.type === kind)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="transactionDate">
              {isExpense ? "Data da Compra" : "Data do Lançamento"}
            </label>
            <input
              id="transactionDate"
              type="date"
              className="input"
              {...register("transactionDate", { required: true })}
            />
          </div>

          <div>
            <label className="label" htmlFor="dueDate">
              Vencimento / Previsão
            </label>
            <input
              id="dueDate"
              type="date"
              className="input"
              {...register("dueDate")}
            />
          </div>

          <div>
            <label className="label" htmlFor="status">
              Situação Inicial
            </label>
            <select
              id="status"
              className="input font-medium"
              {...register("status")}
            >
              <option value="PENDING">⏳ {t.pending}</option>
              <option value="PAID">✔ {t.paid}</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label" htmlFor="notes">
              Observações (opcional)
            </label>
            <input
              id="notes"
              placeholder="Ex: Parcela 2 de 5, boleto enviado por e-mail..."
              className="input text-xs"
              {...register("notes")}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="btn w-full bg-blue-600 hover:bg-blue-700 font-semibold shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando…" : `+ Adicionar ${t.singular}`}
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE PESQUISA E FILTROS                                               */}
      {/* ========================================================================= */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="flex min-w-[200px] max-w-sm flex-1 items-center overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
            <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-500"
              placeholder={`Pesquisar ${t.title.toLowerCase()} por descrição...`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="input max-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todas as situações</option>
            <option value="PENDING">⏳ {t.pending}</option>
            <option value="PAID">✔ {t.paid}</option>
            <option value="CANCELLED">✖ Cancelada</option>
          </select>

          <select
            className="input max-w-[180px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories
              .filter((c) => c.type === kind)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        <div className="text-sm text-slate-600 font-medium">
          Total listado:{" "}
          <strong className={`text-base ${t.color}`}>
            {formatBRL(financialHealth.totalList)}
          </strong>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABELA DE LANÇAMENTOS (Com Marcar Paga, Cancelar, Editar, Visualizar)      */}
      {/* ========================================================================= */}
      <div className="card overflow-hidden p-0 border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Situação</th>
                <th className="px-3 py-3.5">Data</th>
                <th className="px-3 py-3.5">Descrição</th>
                <th className="px-3 py-3.5">Categoria</th>
                <th className="px-3 py-3.5">Conta</th>
                <th className="px-3 py-3.5 text-right">Valor</th>
                <th className="py-3.5 pl-3 pr-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Carregando lançamentos…
                    </div>
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <p className="font-medium text-slate-700">
                      Nenhum lançamento encontrado.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Adicione uma nova {t.singular} acima para começar a
                      controlar seus gastos.
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((i) => {
                  const isPaid = i.status === "PAID";
                  const isPending = i.status === "PENDING";
                  const isCancelled = i.status === "CANCELLED";

                  return (
                    <tr
                      key={i.id}
                      className="group transition-colors hover:bg-slate-50/80 cursor-pointer"
                      onClick={() => setViewTx(i)}
                    >
                      {/* Badge / Marcação de Situação */}
                      <td
                        className="py-3 pl-4 pr-3 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isPaid && (
                          <button
                            title="Clique para desmarcar (voltar a pendente)"
                            onClick={() => act(i.id, "unpay")}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {t.paid}
                          </button>
                        )}
                        {isPending && (
                          <button
                            title={t.payAction}
                            onClick={() => act(i.id, "pay")}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 border border-transparent transition-all"
                          >
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            {t.pending} (Pagar)
                          </button>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            <XCircle className="h-3.5 w-3.5 text-slate-400" />
                            Cancelada
                          </span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        {formatDateBR(i.transactionDate)}
                      </td>

                      {/* Descrição */}
                      <td className="px-3 py-3 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span>{i.description}</span>
                          {i.notes && (
                            <span className="text-[11px] font-normal text-slate-400 line-clamp-1">
                              {i.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {i.category ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-white shadow-xs"
                            style={{
                              backgroundColor: i.category.color ?? "#64748b",
                            }}
                          >
                            <Tag className="h-3 w-3 opacity-80" />
                            {i.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Conta */}
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                          <Wallet className="h-3 w-3 text-slate-400" />
                          {i.account?.name ?? "—"}
                        </span>
                      </td>

                      {/* Valor */}
                      <td
                        className={`px-3 py-3 text-right font-bold whitespace-nowrap ${isCancelled ? "text-slate-400 line-through" : t.color}`}
                      >
                        {formatBRL(i.amount)}
                      </td>

                      {/* Ações (Visualizar, Marcar Paga, Editar, Cancelar) */}
                      <td
                        className="py-3 pl-3 pr-4 whitespace-nowrap text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* Visualizar */}
                          <button
                            title="Visualizar detalhes"
                            onClick={() => setViewTx(i)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Marcar Paga / Alternar */}
                          {isPending && (
                            <button
                              title={t.payAction}
                              onClick={() => act(i.id, "pay")}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            title="Editar lançamento"
                            onClick={() => openEdit(i)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {/* Cancelar */}
                          {!isCancelled && (
                            <button
                              title="Cancelar lançamento"
                              onClick={() => act(i.id, "cancel")}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE VISUALIZAÇÃO DE DETALHES (Pedido: "eu posso clicar e visualizar") */}
      {/* ========================================================================= */}
      {viewTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Fechar */}
            <button
              onClick={() => setViewTx(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Detalhes do Lançamento
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                {viewTx.description}
              </h3>
            </div>

            {/* Valor em destaque */}
            <div className="my-5 rounded-xl bg-slate-50 p-4 text-center border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Valor Total</p>
              <p
                className={`text-3xl font-black ${viewTx.status === "CANCELLED" ? "text-slate-400 line-through" : t.color}`}
              >
                {formatBRL(viewTx.amount)}
              </p>
              <div className="mt-2 flex justify-center">
                {viewTx.status === "PAID" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" /> Conta Paga
                  </span>
                )}
                {viewTx.status === "PENDING" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    <Clock className="h-4 w-4" /> Pagamento Pendente
                  </span>
                )}
                {viewTx.status === "CANCELLED" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                    <XCircle className="h-4 w-4" /> Cancelada
                  </span>
                )}
              </div>
            </div>

            {/* Grid de Informações */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Categoria</span>
                <div>
                  {viewTx.category ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: viewTx.category.color ?? "#64748b",
                      }}
                    >
                      <Tag className="h-3 w-3" />
                      {viewTx.category.name}
                    </span>
                  ) : (
                    <p className="font-medium text-slate-700">Sem categoria</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Conta Bancária</span>
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  <Wallet className="h-4 w-4 text-slate-400" />
                  {viewTx.account?.name ?? "—"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">
                  Data da Compra / Lançamento
                </span>
                <p className="font-medium text-slate-800 flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatDateBR(viewTx.transactionDate)}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Vencimento</span>
                <p className="font-medium text-slate-800 flex items-center gap-1">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {viewTx.dueDate
                    ? formatDateBR(viewTx.dueDate)
                    : "Não informado"}
                </p>
              </div>

              {viewTx.paidAt && (
                <div className="col-span-2 space-y-1 rounded-lg bg-emerald-50/60 p-2 border border-emerald-100">
                  <span className="text-xs font-medium text-emerald-800">
                    Data em que foi paga:
                  </span>
                  <p className="text-xs font-bold text-emerald-900">
                    {formatDateBR(viewTx.paidAt)}
                  </p>
                </div>
              )}

              {viewTx.notes && (
                <div className="col-span-2 space-y-1 border-t pt-2">
                  <span className="text-xs text-slate-500">Observações</span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg">
                    {viewTx.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Ações do Modal */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
              {viewTx.status === "PENDING" && (
                <button
                  onClick={() => act(viewTx.id, "pay")}
                  className="btn bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
                >
                  <CheckCircle2 className="h-4 w-4" /> Marcar como Paga
                </button>
              )}
              {viewTx.status === "PAID" && (
                <button
                  onClick={() => act(viewTx.id, "unpay")}
                  className="btn-ghost text-xs text-amber-700 hover:bg-amber-50"
                >
                  <RotateCcw className="h-4 w-4" /> Desmarcar (Pendente)
                </button>
              )}
              <button
                onClick={() => {
                  const tToEdit = viewTx;
                  setViewTx(null);
                  openEdit(tToEdit);
                }}
                className="btn-ghost text-xs text-slate-700 hover:bg-slate-100"
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
              {viewTx.status !== "CANCELLED" && (
                <button
                  onClick={() => act(viewTx.id, "cancel")}
                  className="btn-ghost text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                >
                  <XCircle className="h-4 w-4" /> Cancelar Lançamento
                </button>
              )}
              <button
                onClick={() => setViewTx(null)}
                className="btn-ghost text-xs text-slate-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO DE CONTA (Pedido: "E editar. Eu consigo editar")           */}
      {/* ========================================================================= */}
      {editTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditTx(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-600" />
                Editar Lançamento
              </h3>
              <p className="text-xs text-slate-500">
                Altere os dados da transação abaixo
              </p>
            </div>

            <form
              onSubmit={handleSubmitEdit(onSubmitEdit)}
              className="space-y-3.5"
            >
              <div>
                <label className="label">Descrição</label>
                <input
                  className="input font-medium"
                  {...registerEdit("description", {
                    required: "Descrição é obrigatória",
                  })}
                />
                {editErrors.description && (
                  <p className="text-xs text-red-600">
                    {editErrors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor (R$)</label>
                  <input
                    className="input font-bold text-slate-900"
                    {...registerEdit("amount", {
                      required: "Valor é obrigatório",
                    })}
                  />
                  {editErrors.amount && (
                    <p className="text-xs text-red-600">
                      {editErrors.amount.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Situação</label>
                  <select
                    className="input font-medium"
                    {...registerEdit("status")}
                  >
                    <option value="PENDING">⏳ {t.pending}</option>
                    <option value="PAID">✔ {t.paid}</option>
                    <option value="CANCELLED">✖ Cancelada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Conta</label>
                  <select
                    className="input"
                    {...registerEdit("accountId", {
                      required: "Selecione a conta",
                    })}
                  >
                    <option value="">Selecione…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {editErrors.accountId && (
                    <p className="text-xs text-red-600">
                      {editErrors.accountId.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Categoria</label>
                  <select className="input" {...registerEdit("categoryId")}>
                    <option value="">Sem categoria</option>
                    {categories
                      .filter((c) => c.type === kind)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Data da Compra</label>
                  <input
                    type="date"
                    className="input"
                    {...registerEdit("transactionDate", { required: true })}
                  />
                </div>
                <div>
                  <label className="label">Vencimento</label>
                  <input
                    type="date"
                    className="input"
                    {...registerEdit("dueDate")}
                  />
                </div>
              </div>

              <div>
                <label className="label">Observações</label>
                <input
                  className="input text-xs"
                  placeholder="Notas sobre este lançamento"
                  {...registerEdit("notes")}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditTx(null)}
                  className="btn-ghost text-xs"
                  disabled={editLoading || isEditSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
                  disabled={editLoading || isEditSubmitting}
                >
                  {editLoading || isEditSubmitting
                    ? "Salvando…"
                    : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
