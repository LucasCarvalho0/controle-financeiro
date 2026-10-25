"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { parseMoneyInput } from "@/lib/currency";

type AccountSummary = {
  id: string;
  name: string;
  type: "CHECKING" | "DIGITAL" | "CASH" | "SAVINGS" | "WALLET" | "OTHER";
  initialBalance: string;
  balance: string;
};

const accountTypes: { value: AccountSummary["type"]; label: string }[] = [
  { value: "CHECKING", label: "Conta corrente" },
  { value: "DIGITAL", label: "Conta digital" },
  { value: "CASH", label: "Dinheiro" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "WALLET", label: "Carteira" },
  { value: "OTHER", label: "Outra" },
];

export function AccountForm({ accounts }: { accounts: AccountSummary[] }) {
  const router = useRouter();
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const raw = String(f.get("initialBalance") ?? "") || "0";
    const initialBalance = parseMoneyInput(raw);
    if (initialBalance === null) return setCreateMsg("Saldo inicial inválido.");

    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        type: f.get("type"),
        initialBalance,
      }),
    });
    if (res.ok) {
      form.reset();
      setCreateMsg(null);
      router.refresh();
    } else {
      setCreateMsg(
        (await res.json()).error?.message ?? "Erro ao salvar a conta.",
      );
    }
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const rawBalance = String(f.get("initialBalance") ?? "");
    const initialBalance = parseMoneyInput(rawBalance || "0");
    if (initialBalance === null) {
      setEditMsg("Saldo inválido. Informe um valor como 0,00.");
      return;
    }

    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"),
        type: f.get("type"),
        initialBalance,
      }),
    });

    if (res.ok) {
      setEditingId(null);
      setEditMsg(null);
      router.refresh();
    } else {
      setEditMsg(
        (await res.json()).error?.message ?? "Erro ao atualizar a conta.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="card grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="name">
            Nome
          </label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="type">
            Tipo
          </label>
          <select id="type" name="type" className="input">
            {accountTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="initialBalance">
            Saldo inicial (R$)
          </label>
          <input
            id="initialBalance"
            name="initialBalance"
            inputMode="decimal"
            placeholder="0,00"
            className="input"
          />
        </div>
        <div className="flex items-end">
          <button className="btn w-full">Adicionar conta</button>
        </div>
        {createMsg && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-4">
            {createMsg}
          </p>
        )}
      </form>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 && (
          <li className="text-sm text-slate-500">Nenhuma conta cadastrada.</li>
        )}
        {accounts.map((account) => (
          <li key={account.id} className="card">
            {editingId === account.id ? (
              <form
                onSubmit={(event) => onUpdate(event, account.id)}
                className="space-y-3"
              >
                <div>
                  <label
                    className="label"
                    htmlFor={`account-name-${account.id}`}
                  >
                    Nome
                  </label>
                  <input
                    id={`account-name-${account.id}`}
                    name="name"
                    required
                    defaultValue={account.name}
                    className="input"
                  />
                </div>
                <div>
                  <label
                    className="label"
                    htmlFor={`account-type-${account.id}`}
                  >
                    Tipo
                  </label>
                  <select
                    id={`account-type-${account.id}`}
                    name="type"
                    defaultValue={account.type}
                    className="input"
                  >
                    {accountTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="label"
                    htmlFor={`account-balance-${account.id}`}
                  >
                    Saldo inicial (R$)
                  </label>
                  <input
                    id={`account-balance-${account.id}`}
                    name="initialBalance"
                    inputMode="decimal"
                    defaultValue={account.initialBalance}
                    placeholder="0,00"
                    className="input"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Deixe vazio para zerar o saldo informado.
                  </p>
                </div>
                {editMsg && (
                  <p role="alert" className="text-sm text-red-600">
                    {editMsg}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditMsg(null);
                    }}
                    className="btn-ghost"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                  <button type="submit" className="btn">
                    <Check className="h-4 w-4" /> Salvar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.name}</p>
                  <p className="text-xs text-slate-500">
                    {
                      accountTypes.find((type) => type.value === account.type)
                        ?.label
                    }
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Saldo informado:{" "}
                    {formatAccountBalance(account.initialBalance)}
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {account.balance}
                  </p>
                  <p className="text-xs text-slate-500">Saldo atual</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(account.id);
                    setEditMsg(null);
                  }}
                  className="btn-ghost shrink-0"
                  aria-label={`Editar ${account.name}`}
                  title="Editar conta e saldo"
                >
                  <Pencil className="h-4 w-4" /> Editar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatAccountBalance(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}
