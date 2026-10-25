"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare, CheckCircle, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Registra o Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 1. Verifica se já está rodando em modo aplicativo instalado (PWA Standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      localStorage.setItem("pwa_installed", "true");
      setInstalled(true);
      setShowBanner(false);
      return;
    }

    // 2. Verifica se o dispositivo já instalou anteriormente
    const wasInstalled = localStorage.getItem("pwa_installed") === "true";
    if (wasInstalled) {
      setInstalled(true);
      setShowBanner(false);
      return;
    }

    // 3. Detecta se é dispositivo iOS (iPhone / iPad)
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isAppleDevice);

    // Se for iOS e não foi instalado, exibe o aviso após 1.5s
    if (isAppleDevice && !wasInstalled) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // 4. Captura o evento nativo de instalação do Android / Chrome / Edge / Windows
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    }

    // 5. Quando o app for instalado com sucesso
    function handleAppInstalled() {
      localStorage.setItem("pwa_installed", "true");
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Ação de download / instalação
  async function handleInstallClick() {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback para navegadores que não disparam beforeinstallprompt
      alert("Para instalar o aplicativo, use o menu do navegador (três pontinhos ⋮ ou botão de compartilhamento) e clique em 'Instalar Aplicativo' ou 'Adicionar à tela inicial'.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem("pwa_installed", "true");
        setInstalled(true);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } catch (e) {
      console.error(e);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
  }

  function markAsInstalledManual() {
    localStorage.setItem("pwa_installed", "true");
    setInstalled(true);
    setShowBanner(false);
    setShowIosGuide(false);
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
              <span className="text-sm font-bold tracking-tight text-white">Controle Pro</span>
              <span className="rounded bg-blue-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-blue-300 border border-blue-400/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5">
              Baixe o aplicativo para acesso rápido no seu dispositivo
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar App
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
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-white shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-blue-500/40">
                <Image src="/icons/icon-192.png" alt="Controle Pro" width={48} height={48} className="h-full w-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Instalar no iPhone / iPad</h4>
                <p className="text-xs text-slate-400">Siga os 3 passos simples abaixo:</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-200 border-y border-slate-800 py-4 my-2">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">1</span>
                <span>Toque no botão <strong>Compartilhar</strong> <Share className="inline h-3.5 w-3.5 text-blue-400" /> na barra inferior do Safari.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">2</span>
                <span>Role para baixo e selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare className="inline h-3.5 w-3.5 text-blue-400" />.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold">3</span>
                <span>Toque em <strong>Adicionar</strong> no canto superior direito para concluir.</span>
              </li>
            </ol>

            <div className="mt-4 flex gap-2">
              <button
                onClick={markAsInstalledManual}
                className="btn w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
              >
                <CheckCircle className="h-4 w-4" />
                Já adicionei à Tela de Início
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
