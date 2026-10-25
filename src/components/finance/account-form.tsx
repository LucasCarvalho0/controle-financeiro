"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseMoneyInput } from "@/lib/currency";

export function AccountForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const raw = String(f.get("initialBalance") ?? "") || "0";
    const initialBalance = parseMoneyInput(raw);
    if (!initialBalance) return setMsg("Saldo inicial inválido.");
    const res = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: f.get("name"), type: f.get("type"), initialBalance }) });
    if (res.ok) { form.reset(); setMsg(null); router.refresh(); }
    else setMsg((await res.json()).error?.message ?? "Erro ao salvar (o nome já existe?).");
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-3 sm:grid-cols-4">
      <div><label className="label" htmlFor="name">Nome</label><input id="name" name="name" required className="input" /></div>
      <div><label className="label" htmlFor="type">Tipo</label>
        <select id="type" name="type" className="input"><option value="CHECKING">Conta corrente</option><option value="DIGITAL">Conta digital</option><option value="CASH">Dinheiro</option><option value="SAVINGS">Poupança</option><option value="WALLET">Carteira</option><option value="OTHER">Outra</option></select></div>
      <div><label className="label" htmlFor="initialBalance">Saldo inicial (R$)</label><input id="initialBalance" name="initialBalance" inputMode="decimal" placeholder="0,00" className="input" /></div>
      <div className="flex items-end"><button className="btn w-full">Adicionar conta</button></div>
      {msg && <p role="alert" className="text-sm text-red-600 sm:col-span-4">⚠ {msg}</p>}
    </form>
  );
}
