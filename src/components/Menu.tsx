"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cerrarSesion } from "@/app/login/actions";
import type { ClaveMenu, ItemMenu } from "@/lib/menu";
import antorcha from "../../public/antorcha-clara.png";
import { BotonTema } from "./BotonTema";
import {
  IcActividades, IcEquipo, IcEvidencias, IcFinanzas, IcInicio, IcJovenes, IcMas, IcReportes, IcSalir,
} from "./Iconos";

const ICONOS: Record<ClaveMenu, (p: { className?: string }) => React.JSX.Element> = {
  inicio: IcInicio, actividades: IcActividades, jovenes: IcJovenes, finanzas: IcFinanzas,
  evidencias: IcEvidencias, reportes: IcReportes, equipo: IcEquipo,
};

const activo = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Al salir se borra lo que el celular guardó para usarse sin internet. */
async function limpiarCache() {
  try {
    if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k);
  } catch {}
}

function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image src={antorcha} alt="" className="h-9 w-auto" priority />
      <span className="leading-none">
        <span className="titulo block text-lg font-semibold">Jóvenes</span>
        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.22em] text-oro-claro">La Luz del Mundo</span>
      </span>
    </Link>
  );
}

function Salir({ conTexto = false }: { conTexto?: boolean }) {
  return (
    <form action={cerrarSesion} onSubmit={limpiarCache}>
      <button className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white ${conTexto ? "w-full" : ""}`} title="Salir">
        <IcSalir />{conTexto && "Salir"}
      </button>
    </form>
  );
}

/**
 * Computadora: barra lateral fija.
 * Celular: barra de arriba (marca) + barra de abajo con 4 secciones y "Más".
 */
export function Menu({ items, nombre }: { items: ItemMenu[]; nombre: string }) {
  const path = usePathname();
  const [mas, setMas] = useState(false);
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";
  const abajo = items.length <= 5 ? items : items.slice(0, 4);
  const resto = items.length <= 5 ? [] : items.slice(4);

  return (
    <>
      {/* ---- Barra lateral (lg+) ---- */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-marca text-white lg:flex">
        <div className="rayos pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative px-5 pb-6 pt-6"><Marca /></div>
        <nav className="relative flex-1 space-y-1 px-3">
          {items.map((it) => {
            const Ic = ICONOS[it.icono];
            const on = activo(path, it.href);
            return (
              <Link key={it.href} href={it.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  on ? "bg-white/12 font-semibold text-white ring-1 ring-inset ring-oro-claro/40" : "text-white/70 hover:bg-white/8 hover:text-white"
                }`}>
                <Ic className={`size-5 ${on ? "text-oro-claro" : ""}`} />{it.n}
              </Link>
            );
          })}
        </nav>
        <div className="relative border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-oro-claro to-oro text-sm font-bold text-marca-oscuro">{inicial}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-white/85">{nombre}</span>
            <BotonTema />
          </div>
          <Salir conTexto />
        </div>
      </aside>

      {/* ---- Barra de arriba (celular) ---- */}
      <header className="no-print sticky top-0 z-30 border-b border-oro/30 bg-marca/95 pt-[env(safe-area-inset-top)] text-white backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Marca />
          <div className="ml-auto flex items-center gap-1">
            <BotonTema />
            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-b from-oro-claro to-oro text-sm font-bold text-marca-oscuro" title={nombre}>{inicial}</span>
          </div>
        </div>
      </header>

      {/* ---- Barra de abajo (celular) ---- */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="flex">
          {abajo.map((it) => {
            const Ic = ICONOS[it.icono];
            const on = activo(path, it.href);
            return (
              <Link key={it.href} href={it.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium ${on ? "text-titulo" : "text-stone-500"}`}>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${on ? "bg-oro-suave" : ""}`}><Ic /></span>
                {it.n}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMas(true)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium ${resto.some((r) => activo(path, r.href)) ? "text-titulo" : "text-stone-500"}`}>
            <span className="flex h-7 w-12 items-center justify-center"><IcMas /></span>Más
          </button>
        </div>
      </nav>

      {/* ---- Hoja "Más" ---- */}
      {mas && (
        <div className="fixed inset-0 z-40 bg-marca-oscuro/50 backdrop-blur-sm lg:hidden [animation:aparecer_.15s_ease-out]" onClick={() => setMas(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-marca p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-white [animation:entrar_.2s_ease-out]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
            <p className="px-3 pb-2 text-sm text-white/60">{nombre}</p>
            {resto.map((it) => {
              const Ic = ICONOS[it.icono];
              return (
                <Link key={it.href} href={it.href} onClick={() => setMas(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] hover:bg-white/10">
                  <Ic className="size-5 text-oro-claro" />{it.n}
                </Link>
              );
            })}
            <div className="mt-2 border-t border-white/10 pt-2"><Salir conTexto /></div>
          </div>
        </div>
      )}
    </>
  );
}
