"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Download,
  X,
  Share,
  PlusSquare,
  CheckCircle,
  MoreVertical,
  MonitorDown,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const INSTALL_DISMISSED_KEY = "pwa-install-dismissed-at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function wasInstallPromptDismissedRecently() {
  try {
    const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_KEY));
    return (
      Number.isFinite(dismissedAt) &&
      Date.now() - dismissedAt < DISMISS_DURATION_MS
    );
  } catch {
    return false;
  }
}

function rememberInstallPromptDismissal() {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  } catch {
    return;
  }
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const isStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isAppleDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(isAppleDevice);

    const dismissedRecently = wasInstallPromptDismissedRecently();

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissedRecently) setShowBanner(true);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timer = window.setTimeout(() => {
      if (!dismissedRecently && !isStandalone()) setShowBanner(true);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Ação de download / instalação
  async function handleInstallClick() {
    if (isIos) {
      setShowInstallGuide(true);
      return;
    }

    if (!deferredPrompt) {
      setShowInstallGuide(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (e) {
      console.error(e);
    }
  }

  function handleDismiss() {
    rememberInstallPromptDismissal();
    setShowBanner(false);
  }

  function dismissInstallGuide() {
    rememberInstallPromptDismissal();
    setShowBanner(false);
    setShowInstallGuide(false);
  }

  // Se já está instalado ou não deve mostrar, não renderiza nada
  if (installed || !showBanner) return null;

  return (
    <>
      {/* BANNER FLUTUANTE DE INSTALAÇÃO */}
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg animate-in slide-in-from-bottom duration-300 md:bottom-6">
        <div className="relative flex items-center justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
          {/* Ícone oficial do app */}
          <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl border border-blue-500/40 shadow-md">
            <Image
              src="/icons/icon-192.png"
              alt="Controle Pro"
              width={52}
              height={52}
              className="h-full w-full object-cover"
              priority
            />
          </div>

          {/* Textos informativos */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white">
                Controle Pro
              </span>
              <span className="rounded bg-blue-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-blue-300 border border-blue-400/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5">
              Instale o app para abrir direto da tela inicial
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Instalar
            </button>

            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* GUIA DE INSTALAÇÃO PARA IPHONE / IPAD (iOS Safari) */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowInstallGuide(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-blue-500/40">
                <Image
                  src="/icons/icon-192.png"
                  alt="Controle Pro"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {isIos
                    ? "Instalar no iPhone ou iPad"
                    : "Instalar Controle Pro"}
                </h4>
                <p className="text-xs text-slate-400">
                  {isIos
                    ? "Use o Safari para adicionar à tela inicial."
                    : "Use o menu do navegador neste dispositivo."}
                </p>
              </div>
            </div>

            <ol className="my-2 space-y-3 border-y border-slate-800 py-4 text-xs text-slate-200">
              {isIos ? (
                <>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">
                      1
                    </span>
                    <span>
                      Abra este site no <strong>Safari</strong> e toque em{" "}
                      <strong>Compartilhar</strong>{" "}
                      <Share className="inline h-3.5 w-3.5 text-blue-400" />.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">
                      2
                    </span>
                    <span>
                      Escolha <strong>Adicionar à Tela de Início</strong>{" "}
                      <PlusSquare className="inline h-3.5 w-3.5 text-blue-400" />
                      .
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">
                      3
                    </span>
                    <span>
                      Confirme em <strong>Adicionar</strong>.
                    </span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">
                      1
                    </span>
                    <span>
                      Abra o menu do navegador{" "}
                      <MoreVertical className="inline h-3.5 w-3.5 text-blue-400" />
                      .
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">
                      2
                    </span>
                    <span>
                      Escolha <strong>Instalar app</strong> ou{" "}
                      <strong>Adicionar à tela inicial</strong>. No computador,
                      procure o ícone de instalação na barra de endereço{" "}
                      <MonitorDown className="inline h-3.5 w-3.5 text-blue-400" />
                      .
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">
                      3
                    </span>
                    <span>Confirme a instalação no navegador.</span>
                  </li>
                </>
              )}
            </ol>

            <div className="mt-4 flex gap-2">
              <button
                onClick={dismissInstallGuide}
                className="btn w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
              >
                <CheckCircle className="h-4 w-4" />
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
