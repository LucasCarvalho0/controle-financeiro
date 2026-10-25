"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  User,
  CreditCard,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Camera,
  X,
} from "lucide-react";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compressão e preview da foto de perfil selecionada
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem válido (JPG ou PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      const img = new window.Image();
      img.src = rawBase64;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 380;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > size) {
            height = Math.round((height * size) / width);
            width = size;
          }
        } else {
          if (height > size) {
            width = Math.round((width * size) / height);
            height = size;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimized = canvas.toDataURL("image/jpeg", 0.85);
          setImage(optimized);
          setError(null);
        }
      };
    };
    reader.readAsDataURL(file);
  }

  // Máscara dinâmica de CPF (000.000.000-00)
  function handleCpfChange(val: string) {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = raw.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    } else if (raw.length > 6) {
      formatted = raw.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (raw.length > 3) {
      formatted = raw.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    }
    setCpf(formatted);
  }

  // Máscara dinâmica de Telefone ((00) 00000-0000)
  function handlePhoneChange(val: string) {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 10) {
      formatted = raw.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    } else if (raw.length > 6) {
      formatted = raw.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
    } else if (raw.length > 2) {
      formatted = raw.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
    }
    setPhone(formatted);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Validações
    if (!name.trim()) {
      return setError("Por favor, informe seu nome completo.");
    }
    if (!email.trim()) {
      return setError("Por favor, informe um e-mail válido.");
    }
    if (password.length < 8) {
      return setError("A senha deve ter no mínimo 8 caracteres.");
    }
    if (password !== confirmPassword) {
      return setError("As senhas digitadas não coincidem. Verifique e confirme novamente.");
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const body = {
        name: name.trim(),
        cpf: cpf.trim() || undefined,
        phone: phone.trim() || undefined,
        email: cleanEmail,
        password,
        image: image || undefined,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        const errorMsg =
          j?.error?.issues?.[0]?.message ||
          j?.error?.message ||
          j?.message ||
          (res.status === 409
            ? "Este e-mail já está cadastrado no sistema."
            : res.status === 429
            ? "Muitas tentativas. Por favor, aguarde alguns instantes."
            : "Não foi possível realizar o cadastro no momento. Tente novamente.");
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Salva o e-mail no dispositivo para facilitar logins futuros
      try {
        localStorage.setItem("last_login_email", cleanEmail);
      } catch {}

      // Login automático instantâneo com as credenciais criadas
      const authRes = await signIn("credentials", {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (authRes?.error) {
        window.location.href = "/login";
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Erro na conexão com o servidor. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto mt-6 mb-12 max-w-md px-4">
      {/* Logo e Cabeçalho Oficial */}
      <div className="mb-6 text-center flex flex-col items-center">
        <div className="relative mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 p-1 shadow-lg shadow-blue-500/20 ring-4 ring-blue-50">
          <Image
            src="/icons/icon.png"
            alt="Logo Controle Pro"
            width={56}
            height={56}
            className="h-full w-full object-cover rounded-xl"
            priority
          />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Criar sua <span className="text-blue-600">Conta</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Preencha seus dados para ter acesso exclusivo ao seu controle financeiro.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 shadow-md border-slate-200/90 bg-white/95 backdrop-blur p-6 rounded-2xl">
        {/* Upload de Foto de Perfil */}
        <div className="flex flex-col items-center pb-2">
          <label className="text-xs font-semibold text-slate-700 mb-2">
            Sua Foto de Perfil (Opcional)
          </label>
          <div className="relative group">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-slate-50 shadow-inner">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Foto de perfil preview" className="h-full w-full object-cover" />
              ) : (
                <User className="h-9 w-9 text-slate-400" />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors"
              title="Escolher foto"
            >
              <Camera size={14} />
            </button>

            {image && (
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors"
                title="Remover foto"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 text-[11px] font-semibold text-blue-600 hover:underline"
          >
            {image ? "Trocar foto selecionada" : "Clique para escolher uma foto"}
          </button>
        </div>
        {/* Nome Completo */}
        <div>
          <label className="label" htmlFor="name">
            Nome Completo
          </label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="name"
              name="name"
              required
              minLength={2}
              placeholder="Ex: João da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input !pl-9 font-medium"
            />
          </div>
        </div>

        {/* Grid: CPF e Telefone */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cpf">
              CPF
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="cpf"
                name="cpf"
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                className="input !pl-9 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="phone">
              Telefone / Celular
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="phone"
                name="phone"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="input !pl-9 font-medium"
              />
            </div>
          </div>
        </div>

        {/* E-mail */}
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
              className="input !pl-9 font-medium"
            />
          </div>
        </div>

        {/* Senha */}
        <div>
          <label className="label" htmlFor="password">
            Senha (mínimo 8 caracteres)
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Digite uma senha forte"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input !pl-9 !pr-10 font-medium"
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

        {/* Confirmar Senha */}
        <div>
          <label className="label" htmlFor="confirmPassword">
            Confirmar Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Repita a mesma senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input !pl-9 !pr-10 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center p-1 text-slate-400 hover:text-slate-700"
              aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Feedback de igualdade das senhas */}
          {confirmPassword && (
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              {password === confirmPassword ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> As senhas conferem perfeitamente.
                </span>
              ) : (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertCircle size={12} /> As senhas não conferem.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
            <div className="flex items-center gap-1.5">
              <span>⚠ {error}</span>
            </div>
            {error.includes("já está cadastrado") && (
              <div className="mt-2 pt-2 border-t border-rose-200">
                <Link href="/login" className="font-bold underline text-blue-700 hover:text-blue-900 block">
                  Já possui conta? Clique aqui para fazer Login →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Botão de Enviar */}
        <button
          type="submit"
          className="btn w-full bg-blue-600 hover:bg-blue-700 shadow-sm font-semibold"
          disabled={loading}
        >
          {loading ? "Criando sua conta e entrando…" : "Cadastrar e Entrar"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600">
        Já tem uma conta?{" "}
        <Link className="font-semibold text-blue-600 underline hover:text-blue-700" href="/login">
          Entrar aqui
        </Link>
      </p>
    </main>
  );
}
