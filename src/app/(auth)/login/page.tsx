"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Recupera o último e-mail gravado no dispositivo
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("last_login_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Grava o e-mail para próximas visitas
      if (email.trim()) {
        localStorage.setItem("last_login_email", email.trim().toLowerCase());
      }

      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("E-mail ou senha incorretos.");
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Erro ao tentar entrar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto mt-12 max-w-sm px-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Acesse sua conta</h1>
        <p className="mt-1 text-xs text-slate-500">
          Informe sua senha para entrar no seu painel financeiro.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 shadow-sm border-slate-200">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-9 font-medium"
            />
          </div>
          {email && (
            <p className="mt-1 text-[11px] text-slate-400">
              E-mail memorizado no seu navegador.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="password">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-9 pr-10 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center p-1 text-slate-400 hover:text-slate-700"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700 border border-rose-200">
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          className="btn w-full bg-blue-600 hover:bg-blue-700 shadow-sm font-semibold"
          disabled={loading}
        >
          {loading ? "Entrando…" : "Entrar"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600">
        Não tem conta ainda?{" "}
        <Link className="font-semibold text-blue-600 underline hover:text-blue-700" href="/cadastro">
          Criar cadastro
        </Link>
      </p>
    </main>
  );
}
