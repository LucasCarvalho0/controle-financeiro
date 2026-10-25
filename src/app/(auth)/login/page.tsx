"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

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
        setError("E-mail ou senha incorretos. Verifique suas credenciais.");
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Erro ao tentar entrar no sistema. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto mt-4 mb-8 max-w-sm px-4 sm:mt-6 sm:mb-12">
      {/* Logo e Cabeçalho Oficial do Sistema */}
      <div className="mb-6 text-center flex flex-col items-center sm:mb-8">
        <div className="relative mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 p-1 shadow-lg shadow-blue-500/20 ring-4 ring-blue-50">
          <Image
            src="/icons/icon.png"
            alt="Logo Controle Pro"
            width={64}
            height={64}
            className="h-full w-full object-cover rounded-xl"
            priority
          />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Controle <span className="text-blue-600">Pro</span>
        </h1>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Gestão financeira inteligente, simples e segura.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="card space-y-4 shadow-md border-slate-200/90 bg-white/95 backdrop-blur p-5 rounded-2xl sm:p-6"
      >
        <div>
          <label
            className="label text-xs font-semibold text-slate-700"
            htmlFor="email"
          >
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input !pl-9 font-medium text-sm placeholder:font-normal placeholder:text-slate-500"
            />
          </div>
          {email && (
            <p className="mt-1 text-xs text-slate-500">
              E-mail memorizado no seu dispositivo.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              className="label text-xs font-semibold text-slate-700"
              htmlFor="password"
            >
              Senha
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
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
              className="input !pl-9 !pr-10 font-medium text-sm placeholder:font-normal placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center p-1 text-slate-500 hover:text-slate-800"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200 animate-in fade-in">
            ⚠ {error}
          </div>
        )}

        <button
          type="submit"
          className="btn w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 font-semibold py-2.5 rounded-xl transition-all"
          disabled={loading}
        >
          {loading ? "Entrando no sistema…" : "Acessar minha conta"}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </button>
      </form>

      <div className="mt-5 text-center space-y-3 sm:mt-6">
        <p className="text-sm text-slate-600">
          Ainda não possui uma conta?{" "}
          <Link
            className="font-bold text-blue-600 underline hover:text-blue-700"
            href="/cadastro"
          >
            Cadastre-se grátis
          </Link>
        </p>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Acesso criptografado e seguro</span>
        </div>
      </div>
    </main>
  );
}
