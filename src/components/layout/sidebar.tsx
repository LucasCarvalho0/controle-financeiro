"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Landmark,
  Tags,
  Users,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", icon: TrendingUp },
  { href: "/despesas", label: "Despesas", icon: TrendingDown },
  { href: "/contas", label: "Contas", icon: Landmark },
  { href: "/categorias", label: "Categorias", icon: Tags },
];

interface SidebarProps {
  isAdmin?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
}

export function Sidebar({ isAdmin, userName, userEmail, userImage }: SidebarProps) {
  const path = usePathname();

  const items = isAdmin
    ? [...baseItems, { href: "/usuarios", label: "Usuários", icon: Users }]
    : baseItems;

  const initials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : userEmail?.slice(0, 2).toUpperCase() ?? "CP";

  return (
    <>
      {/* Desktop: navegação lateral */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-slate-200 bg-white p-4 md:flex shadow-sm z-30">
        {/* Logo Oficial do Sistema */}
        <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-1 group">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-sm transition-transform group-hover:scale-105">
            <Image
              src="/icons/icon.png"
              alt="Controle Pro"
              width={40}
              height={40}
              className="object-cover"
              priority
            />
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-slate-900 block leading-none">
              Controle Pro
            </span>
            <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block mt-1">
              Finanças
            </span>
          </div>
        </Link>

        {isAdmin && (
          <div className="mb-4 px-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <ShieldCheck size={12} /> Administrador
            </span>
          </div>
        )}

        <nav className="flex-1 space-y-1">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                path === href
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>

        {/* Rodapé: Usuário com Foto e Botão de Sair */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-400 bg-slate-100">
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userImage} alt={userName || "Usuário"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-600 text-[10px] font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800 leading-tight">
                {userName || "Usuário"}
              </p>
              {userEmail && (
                <p className="truncate text-[10px] text-slate-400 leading-tight mt-0.5">{userEmail}</p>
              )}
            </div>
          </div>

          <button
            className="btn w-full justify-center gap-2 text-xs border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium py-1.5"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={13} /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md py-1.5 md:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center px-2 py-1 text-[11px] transition-colors ${
              path === href ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Icon size={19} />
            <span className="mt-0.5">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
