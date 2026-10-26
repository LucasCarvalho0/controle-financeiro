"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Camera,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Bell,
  Check,
  CheckCheck,
  X,
  LoaderCircle,
} from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  scheduledFor: string | null;
  readAt: string | null;
  createdAt: string;
};

interface TopBarProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    cpf?: string | null;
    phone?: string | null;
    timezone?: string;
  };
  isAdmin?: boolean;
}

export function TopBar({ user, isAdmin }: TopBarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(user.image);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationLoadingMore, setNotificationLoadingMore] = useState(false);
  const [notificationAction, setNotificationAction] = useState<string | null>(
    null,
  );
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    const refreshUnreadCount = async () => {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unread count request failed");
        const data = (await response.json()) as { count: number };
        if (active) setUnreadCount(data.count);
      } catch {
        if (active)
          setNotificationError("Não foi possível carregar as notificações.");
      }
    };
    void refreshUnreadCount();
    const interval = window.setInterval(refreshUnreadCount, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!notificationOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!notificationPanelRef.current?.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationOpen]);

  async function loadNotifications(page = 1, append = false) {
    if (append) setNotificationLoadingMore(true);
    else setNotificationLoading(true);
    setNotificationError(null);
    try {
      const response = await fetch(
        `/api/notifications?page=${page}&pageSize=20`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error("Não foi possível carregar as notificações.");
      const data = (await response.json()) as {
        items: NotificationItem[];
        total: number;
        page: number;
      };
      setNotifications((current) =>
        append ? [...current, ...data.items] : data.items,
      );
      setNotificationTotal(data.total);
      setNotificationPage(data.page);
    } catch {
      setNotificationError("Não foi possível carregar as notificações.");
    } finally {
      setNotificationLoading(false);
      setNotificationLoadingMore(false);
    }
  }

  async function markNotificationRead(notification: NotificationItem) {
    setNotificationAction(notification.id);
    setNotificationError(null);
    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(notification.id)}/read`,
        { method: "PATCH" },
      );
      if (!response.ok)
        throw new Error("Não foi possível atualizar a notificação.");
      const data = (await response.json()) as { readAt: string | null };
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: data.readAt } : item,
        ),
      );
      if (!notification.readAt)
        setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      setNotificationError("Não foi possível atualizar a notificação.");
    } finally {
      setNotificationAction(null);
    }
  }

  async function markAllNotificationsRead() {
    setNotificationAction("all");
    setNotificationError(null);
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (!response.ok)
        throw new Error("Não foi possível atualizar as notificações.");
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      );
      setUnreadCount(0);
    } catch {
      setNotificationError("Não foi possível atualizar as notificações.");
    } finally {
      setNotificationAction(null);
    }
  }

  function formatNotificationDate(value: string) {
    const date = new Date(value);
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: user.timezone || "America/Sao_Paulo",
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
    }
  }

  // Iniciais do nome para fallback
  const initials = user.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  // Compressão e envio da foto para o servidor
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Checagem de tipo
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;

        // Redimensiona para manter leve e nítido (máx 400x400)
        const img = new window.Image();
        img.src = rawBase64;
        img.onload = async () => {
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
            const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.85);

            // Salva na API
            const res = await fetch("/api/user/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: optimizedBase64 }),
            });

            if (res.ok) {
              setCurrentImage(optimizedBase64);
              setFeedback("Foto atualizada com sucesso!");
              startTransition(() => {
                // Atualiza a página suavemente se necessário
              });
            } else {
              setFeedback(
                "Não foi possível salvar a foto. Tente outra imagem.",
              );
            }
          }
          setUploading(false);
        };
      };
      reader.readAsDataURL(file);
    } catch {
      setFeedback("Erro ao processar imagem.");
      setUploading(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-20 mb-6 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md md:px-8">
        {/* Lado esquerdo: Logo em telas mobile ou saudação no desktop */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 md:hidden"
          >
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 shadow-sm">
              <Image
                src="/icons/icon.png"
                alt="Controle Pro"
                width={36}
                height={36}
                className="object-cover"
                priority
              />
            </div>
            <span className="font-bold tracking-tight text-slate-900 text-sm">
              Controle Pro
            </span>
          </Link>

          <div className="hidden md:block">
            <p className="text-xs font-medium text-slate-400">
              Bem-vindo(a) ao seu painel
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {user.name || user.email.split("@")[0]}
            </p>
          </div>
        </div>

        {/* Lado direito: Bem no canto superior direito - Imagem e Perfil do Usuário */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              <ShieldCheck size={12} /> Admin
            </span>
          )}

          <div className="relative" ref={notificationPanelRef}>
            <button
              type="button"
              onClick={() => {
                const open = !notificationOpen;
                setNotificationOpen(open);
                if (open) void loadNotifications();
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ""}`}
              aria-expanded={notificationOpen}
              aria-haspopup="dialog"
              title="Notificações"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-5 text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <section
                role="dialog"
                aria-label="Notificações financeiras"
                className="fixed right-4 top-[calc(env(safe-area-inset-top)+5rem)] z-50 flex max-h-[calc(100dvh-6rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden overscroll-contain rounded-xl border border-slate-200 bg-white shadow-xl md:right-8"
              >
                <div className="flex flex-col items-start gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Notificações
                    </h2>
                    <p className="text-xs text-slate-500">
                      {unreadCount} não lida{unreadCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    disabled={unreadCount === 0 || notificationAction !== null}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                    Marcar todas como lidas
                  </button>
                </div>

                {notificationError && (
                  <p
                    role="alert"
                    className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700"
                  >
                    {notificationError}
                  </p>
                )}

                <div className="min-h-28 overflow-y-auto">
                  {notificationLoading ? (
                    <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                      <LoaderCircle
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Carregando notificações…
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">
                      Nenhuma notificação por enquanto.
                    </p>
                  ) : (
                    <ul>
                      {notifications.map((notification) => (
                        <li
                          key={notification.id}
                          className={`border-b border-slate-100 px-4 py-3 last:border-b-0 ${notification.readAt ? "bg-white" : "bg-blue-50/70"}`}
                        >
                          <div className="flex items-start gap-2">
                            {!notification.readAt && (
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                                aria-label="Não lida"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                {notification.message}
                              </p>
                              <time
                                className="mt-1.5 block text-[11px] text-slate-500"
                                dateTime={notification.createdAt}
                              >
                                {formatNotificationDate(notification.createdAt)}
                              </time>
                            </div>
                            {!notification.readAt && (
                              <button
                                type="button"
                                onClick={() =>
                                  markNotificationRead(notification)
                                }
                                disabled={notificationAction !== null}
                                className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-blue-700 disabled:opacity-50"
                                aria-label={`Marcar como lida: ${notification.title}`}
                                title="Marcar como lida"
                              >
                                {notificationAction === notification.id ? (
                                  <LoaderCircle
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Check
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {!notificationLoading &&
                  notifications.length < notificationTotal && (
                    <button
                      type="button"
                      onClick={() =>
                        void loadNotifications(notificationPage + 1, true)
                      }
                      disabled={notificationLoadingMore}
                      className="border-t border-slate-200 px-4 py-2.5 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                    >
                      {notificationLoadingMore
                        ? "Carregando…"
                        : "Carregar mais"}
                    </button>
                  )}
              </section>
            )}
          </div>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="group flex items-center gap-2.5 rounded-full p-1 pr-3 transition-all hover:bg-slate-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            title="Ver meu perfil e foto"
          >
            {/* Foto de Perfil Nítida */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-600 shadow-sm transition-transform group-hover:scale-105">
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImage}
                  alt={user.name || "Foto de Perfil"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white">
                  {initials}
                </div>
              )}
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-[130px] truncate text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                {user.name || "Minha Conta"}
              </p>
              <p className="text-[10px] text-slate-400">Ver Perfil</p>
            </div>
          </button>
        </div>
      </header>

      {/* Modal de Perfil e Upload de Foto */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              onClick={() => {
                setProfileOpen(false);
                setFeedback(null);
              }}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Meu Perfil</h3>
              <p className="text-xs text-slate-500">
                Visualize e altere sua foto de perfil quando quiser.
              </p>
            </div>

            {/* Avatar em Destaque com botão de alteração */}
            <div className="mt-5 flex flex-col items-center">
              <div className="relative group">
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-blue-500 shadow-md">
                  {currentImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentImage}
                      alt={user.name || "Foto de perfil"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-700 text-2xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-400"
                  title="Alterar foto"
                >
                  <Camera size={15} />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Camera size={13} />
                {uploading ? "Atualizando foto..." : "Alterar Foto de Perfil"}
              </button>

              {feedback && (
                <p className="mt-2 text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {feedback}
                </p>
              )}
            </div>

            {/* Informações da Conta */}
            <div className="mt-5 space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Nome:</span>
                <span className="font-semibold text-slate-800">
                  {user.name || "Não informado"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">E-mail:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                  {user.email}
                </span>
              </div>
              {user.cpf && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">CPF:</span>
                  <span className="font-medium text-slate-800">{user.cpf}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Telefone:</span>
                  <span className="font-medium text-slate-800">
                    {user.phone}
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="btn w-full justify-center gap-2 border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <LogOut size={14} /> Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
