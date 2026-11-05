"use client";

import { useEffect, useState } from "react";

type PromptInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Registra el service worker y, si la app no está instalada, ofrece instalarla:
 *  - Android/Chrome: botón "Instalar" (el navegador hace el resto).
 *  - iPhone/iPad: Safari no tiene botón, así que se explica cómo (Compartir → Agregar a inicio).
 * Si la cierran, no vuelve a salir en 30 días.
 */
export function InstalarApp() {
  const [modo, setModo] = useState<"android" | "ios" | "ios-otro" | null>(null);
  const [evento, setEvento] = useState<PromptInstalar | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const instalada = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let oculta = false;
    try { oculta = Number(localStorage.getItem("instalar-oculto") ?? 0) > Date.now(); } catch {}
    if (instalada || oculta) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) {
      // En iPhone solo Safari puede instalar (Chrome/WhatsApp no)
      const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|GSA|FBAN|FBAV|Instagram|WhatsApp/.test(ua);
      setModo(safari ? "ios" : "ios-otro");
      return;
    }
    const alInstalar = (e: Event) => { e.preventDefault(); setEvento(e as PromptInstalar); setModo("android"); };
    window.addEventListener("beforeinstallprompt", alInstalar);
    return () => window.removeEventListener("beforeinstallprompt", alInstalar);
  }, []);

  function cerrar() {
    setModo(null);
    try { localStorage.setItem("instalar-oculto", String(Date.now() + 30 * 864e5)); } catch {}
  }

  if (!modo) return null;

  return (
    <div className="no-print mb-5 flex items-start gap-3 rounded-2xl border border-oro/40 bg-oro-suave p-4 text-sm text-titulo lg:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/iconos/icono-192.png" alt="" className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Instala la app en tu celular</p>
        {modo === "android" && <p className="mt-0.5 text-stone-600">Queda como ícono en tu pantalla y abre aunque no haya señal.</p>}
        {modo === "ios" && (
          <p className="mt-0.5 text-stone-600">
            Toca <b>Compartir</b>{" "}
            <svg viewBox="0 0 24 24" className="inline size-4 align-text-bottom" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M8 7l4-4 4 4" /><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" /></svg>{" "}
            abajo y luego <b>Agregar a inicio</b>.
          </p>
        )}
        {modo === "ios-otro" && <p className="mt-0.5 text-stone-600">En iPhone se instala desde <b>Safari</b>: abre esta página en Safari y toca Compartir → <b>Agregar a inicio</b>.</p>}
        {modo === "android" && evento && (
          <button type="button" onClick={async () => { await evento.prompt(); setModo(null); }}
            className="mt-2 rounded-lg bg-marca px-3 py-1.5 text-xs font-semibold text-white">Instalar</button>
        )}
      </div>
      <button type="button" onClick={cerrar} aria-label="Cerrar" className="text-stone-400 hover:text-titulo">✕</button>
    </div>
  );
}
