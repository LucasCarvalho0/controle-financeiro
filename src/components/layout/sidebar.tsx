"use client";

import Link from "next/link";
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

export function Sidebar({ isAdmin, userEmail }: { isAdmin?: boolean; userEmail?: string | null }) {
  const path = usePathname();

  const items = isAdmin
    ? [...baseItems, { href: "/usuarios", label: "Usuários", icon: Users }]
    : baseItems;

  return (
    <>
      {/* Desktop: navegação lateral */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r bg-white p-4 md:flex">
        <div className="mb-6">
          <p className="text-lg font-bold text-blue-700">Controle Financeiro</p>
          {isAdmin ? (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <ShieldCheck size={12} /> Administrador
            </span>
          ) : (
            userEmail && <p className="text-[11px] text-slate-400 truncate mt-0.5">{userEmail}</p>
          )}
        </div>

        <nav className="flex-1 space-y-1">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                path === href
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>

        <div className="border-t pt-3 space-y-2">
          {userEmail && (
            <p className="text-[11px] text-slate-400 truncate px-2">{userEmail}</p>
          )}
          <button
            className="btn-ghost w-full justify-start gap-2 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut size={14} /> Sair da conta
          </button>
        </div>
      </aside>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-white py-1 md:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center px-2 py-1 text-[11px] ${
              path === href ? "text-blue-700 font-semibold" : "text-slate-600"
            }`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
