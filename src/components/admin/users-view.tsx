"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  User,
  KeyRound,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  Lock,
} from "lucide-react";
import { formatDateBR } from "@/lib/dates";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  _count?: {
    transactions: number;
    financialAccounts: number;
    categories: number;
  };
}

export function UsersView({ currentEmail }: { currentEmail?: string | null }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Modal de Novo Usuário
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal de Redefinir Senha
  const [resetModalUser, setResetModalUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Copiar link de cadastro
  const [copied, setCopied] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      } else {
        const j = await res.json();
        setMsg({ ok: false, text: j.error?.message ?? "Acesso restrito." });
      }
    } catch {
      setMsg({ ok: false, text: "Erro ao conectar com o servidor." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      if (res.ok) {
        setMsg({ ok: true, text: `Usuário "${name}" cadastrado com sucesso! Já pode fazer login.` });
        setCreateModalOpen(false);
        setName("");
        setEmail("");
        setPassword("");
        void loadUsers();
      } else {
        const j = await res.json();
        alert(j.error?.message ?? "Erro ao criar usuário.");
      }
    } catch {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetModalUser || newPassword.length < 8) return;

    setResetting(true);
    try {
      const res = await fetch(`/api/users/${resetModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setMsg({ ok: true, text: `Senha do usuário ${resetModalUser.email} alterada com sucesso!` });
        setResetModalUser(null);
        setNewPassword("");
      } else {
        const j = await res.json();
        alert(j.error?.message ?? "Erro ao redefinir senha.");
      }
    } catch {
      alert("Erro ao redefinir senha.");
    } finally {
      setResetting(false);
    }
  }

  async function handleDeleteUser(user: UserItem) {
    if (!confirm(`Deseja realmente excluir o usuário "${user.name ?? user.email}"? Esta ação removerá a conta e seus dados.`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setMsg({ ok: true, text: "Usuário removido com sucesso." });
        void loadUsers();
      } else {
        const j = await res.json();
        alert(j.error?.message ?? "Erro ao remover usuário.");
      }
    } catch {
      alert("Erro ao conectar com o servidor.");
    }
  }

  function copyRegisterLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/cadastro`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Gestão de Usuários
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Administrador
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Você é o administrador principal. Aqui você pode cadastrar e gerenciar as pessoas autorizadas a usar o sistema (até 10 pessoas).
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn bg-blue-600 hover:bg-blue-700 shadow-sm text-sm font-semibold"
        >
          <UserPlus className="h-4 w-4" />
          + Cadastrar Nova Pessoa
        </button>
      </div>

      {/* FEEDBACK MSG */}
      {msg && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-all ${
            msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {msg.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
            {msg.text}
          </span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* CARD DE INFORMAÇÃO E LINK DE AUTO-CADASTRO */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-xs font-medium text-slate-500">Total de Usuários Cadastrados</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{users.length} <span className="text-sm font-normal text-slate-500">/ 10 vagas</span></p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-blue-600 transition-all rounded-full"
              style={{ width: `${Math.min((users.length / 10) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="card md:col-span-2 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-blue-600" />
              Link Direto para Auto-Cadastro
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Você pode enviar este link para uma pessoa se cadastrar por conta própria. Cada pessoa terá seu próprio controle e dados 100% isolados.
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700 truncate">
              {typeof window !== "undefined" ? `${window.location.origin}/cadastro` : "/cadastro"}
            </code>
            <button
              onClick={copyRegisterLink}
              className="btn-ghost text-xs gap-1.5 shrink-0 hover:bg-blue-50 hover:text-blue-700"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar Link"}
            </button>
          </div>
        </div>
      </div>

      {/* TABELA DE USUÁRIOS */}
      <div className="card overflow-hidden p-0 border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Usuário</th>
                <th className="px-3 py-3.5">E-mail</th>
                <th className="px-3 py-3.5">Papel</th>
                <th className="px-3 py-3.5">Cadastrado em</th>
                <th className="py-3.5 pl-3 pr-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Carregando lista de usuários…
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                users.map((u) => {
                  const isAdmin = u.email === "llclucas3@gmail.com";
                  const isCurrent = u.email === currentEmail;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-4 pr-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                            {(u.name || u.email || "U").charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {u.name || "Sem nome"}
                              {isCurrent && <span className="ml-1.5 text-[11px] text-blue-600 font-normal">(Você)</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-slate-600 font-mono text-xs">{u.email}</td>

                      <td className="px-3 py-3.5">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            ★ Administrador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <User className="h-3 w-3" /> Usuário
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDateBR(u.createdAt)}
                        </span>
                      </td>

                      <td className="py-3.5 pl-3 pr-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            title="Redefinir senha deste usuário"
                            onClick={() => {
                              setResetModalUser(u);
                              setNewPassword("");
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>

                          {!isAdmin && (
                            <button
                              title="Excluir este usuário"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
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
      {/* MODAL DE CADASTRAR NOVO USUÁRIO                                           */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Cadastrar Nova Pessoa
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              A pessoa terá acesso independente com e-mail e senha cadastrados aqui.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="label">Nome da Pessoa</label>
                <input
                  className="input font-medium"
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">E-mail de Acesso</label>
                <input
                  type="email"
                  className="input font-medium"
                  placeholder="Ex: joao@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Senha Inicial (mínimo 8 caracteres)</label>
                <input
                  type="password"
                  className="input font-medium"
                  placeholder="Defina uma senha provisória"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-ghost text-xs"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
                  disabled={submitting}
                >
                  {submitting ? "Criando…" : "Cadastrar Pessoa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE REDEFINIR SENHA                                                  */}
      {/* ========================================================================= */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setResetModalUser(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              Redefinir Senha
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Definir uma nova senha para o usuário: <strong>{resetModalUser.email}</strong>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="label">Nova Senha (mínimo 8 caracteres)</label>
                <input
                  type="password"
                  className="input font-medium"
                  placeholder="Digite a nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="btn-ghost text-xs"
                  disabled={resetting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn bg-amber-600 hover:bg-amber-700 text-xs font-semibold"
                  disabled={resetting}
                >
                  {resetting ? "Salvando…" : "Redefinir Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
