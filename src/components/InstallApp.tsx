"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Registra o service worker do PWA (necessário para a tela "sem conexão"). Vai no layout raiz. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/**
 * Botão "Instalar aplicativo".
 * - Android/Chrome/Edge: usa o convite nativo de instalação (beforeinstallprompt).
 * - iPhone/iPad (Safari não tem convite): mostra o passo a passo "Compartilhar → Adicionar à Tela de Início".
 * - Já instalado (aberto como app): não aparece.
 */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios" | "manual">("hidden");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (standalone) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setMode(ios ? "ios" : "manual");

    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPromptEvent); setMode("prompt"); };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "hidden") return null;

  if (mode === "prompt" && prompt) {
    return (
      <button
        type="button"
        className={`btn-primary ${className}`}
        onClick={async () => {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          setPrompt(null);
          setMode(outcome === "accepted" ? "hidden" : "manual");
        }}
      >
        <Download className="h-4 w-4" aria-hidden /> Instalar aplicativo
      </button>
    );
  }

  return (
    <div className={`rounded-xl border border-soma-200 bg-soma-50 p-3 text-sm text-soma-900 ${className}`}>
      <p className="flex items-center gap-2 font-semibold"><Download className="h-4 w-4" aria-hidden /> Instale o SOMA Conecta</p>
      {mode === "ios" ? (
        <p className="mt-1">
          No Safari, toque em <Share className="inline h-4 w-4 align-text-bottom" aria-label="Compartilhar" /> <strong>Compartilhar</strong> e
          depois em <strong>“Adicionar à Tela de Início”</strong>.
        </p>
      ) : (
        <p className="mt-1">
          No menu do navegador (⋮), escolha <strong>“Instalar aplicativo”</strong> ou <strong>“Adicionar à tela inicial”</strong>.
        </p>
      )}
    </div>
  );
}
