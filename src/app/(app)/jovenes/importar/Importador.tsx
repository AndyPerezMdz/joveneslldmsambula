"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { bonito, normalizar } from "@/lib/nombres";
import { ui } from "@/lib/ui";
import { importarJovenes } from "./actions";

type Fila = { nombre: string; email: string | null; telefono: string | null; estado: "nuevo" | "existe" | "repetido" | "invalido" };

const esCorreo = (t: string) => /^\S+@\S+\.\S+$/.test(t);
const esTelefono = (t: string) => /^[+\d][\d\s().-]{6,}$/.test(t) && t.replace(/\D/g, "").length >= 7;

/**
 * Lee lo que se pegue de Excel/Sheets (columnas con tabulador) o un CSV.
 * Las columnas que no son correo ni teléfono se juntan como nombre
 * (sirve para "Nombre | Apellido paterno | Apellido materno").
 */
function leer(texto: string, existentes: Set<string>): Fila[] {
  const lineas = texto.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lineas.length) return [];
  const sep = lineas.some((l) => l.includes("\t")) ? "\t" : lineas.some((l) => l.includes(";")) ? ";" : lineas.some((l) => l.includes(",")) ? "," : null;
  const vistos = new Set<string>();
  const filas: Fila[] = [];
  lineas.forEach((l, i) => {
    const celdas = (sep ? l.split(sep) : [l]).map((c) => c.trim().replace(/^"|"$/g, "")).filter(Boolean);
    if (i === 0 && celdas.some((c) => /^(nombre|nombres|name|apellido)/i.test(c))) return; // encabezado
    const email = celdas.find(esCorreo) ?? null;
    const telefono = celdas.find((c) => c !== email && esTelefono(c)) ?? null;
    const nombre = bonito(celdas.filter((c) => c !== email && c !== telefono && !/^\d+$/.test(c)).join(" "));
    const k = normalizar(nombre);
    const estado: Fila["estado"] =
      nombre.length < 2 ? "invalido" : existentes.has(k) ? "existe" : vistos.has(k) ? "repetido" : "nuevo";
    vistos.add(k);
    filas.push({ nombre, email: email?.toLowerCase() ?? null, telefono, estado });
  });
  return filas;
}

const ETIQUETA = {
  nuevo: { t: "Nuevo", c: "bg-green-50 text-green-800" },
  existe: { t: "Ya está", c: "bg-stone-100 text-stone-500" },
  repetido: { t: "Repetido", c: "bg-amber-50 text-amber-900" },
  invalido: { t: "Sin nombre", c: "bg-red-50 text-red-700" },
};

export function Importador({ existentes }: { existentes: string[] }) {
  const [texto, setTexto] = useState("");
  const [estado, action, pendiente] = useActionState(importarJovenes, null);
  const base = useMemo(() => new Set(existentes), [existentes]);
  const filas = useMemo(() => leer(texto, base), [texto, base]);
  const nuevos = filas.filter((f) => f.estado === "nuevo");

  async function abrirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setTexto(await f.text());
  }

  if (estado?.ok) {
    return (
      <div className={`${ui.card} space-y-4 text-center`}>
        <p className="text-lg font-semibold text-green-800">{estado.mensaje}</p>
        <Link href="/jovenes" className={ui.btn}>Ver la lista</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className={`${ui.card} space-y-4 lg:col-span-2`}>
        <div>
          <h2 className={ui.h2}>1. Pega la lista</h2>
          <p className={ui.ayuda}>
            Desde Excel o Google Sheets: selecciona las columnas (nombre y, si hay, correo y teléfono),
            cópialas y pégalas aquí. También sirve un nombre por renglón.
          </p>
        </div>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={12}
          placeholder={"Ana López\nJosé Pérez Canul\tjose@gmail.com\t9991234567\n…"}
          className={`${ui.input} font-mono text-sm`} aria-label="Lista de jóvenes" />
        <label className={`${ui.btnSec} w-full cursor-pointer`}>
          O sube un archivo .csv / .txt
          <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" onChange={abrirArchivo} className="sr-only" />
        </label>
      </div>

      <div className={`${ui.card} space-y-4 lg:col-span-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={ui.h2}>2. Revisa</h2>
          {filas.length > 0 && (
            <p className="text-sm text-stone-500">
              <b className="text-green-800">{nuevos.length} nuevos</b> de {filas.length} renglones
            </p>
          )}
        </div>
        {filas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
            Aquí vas a ver cómo quedó cada renglón antes de guardar.
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-auto rounded-2xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stone-50 text-left text-xs uppercase tracking-wider text-stone-500">
                <tr><th className="px-3 py-2">Nombre</th><th className="hidden px-3 py-2 sm:table-cell">Correo</th><th className="hidden px-3 py-2 sm:table-cell">Teléfono</th><th className="px-3 py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70">
                {filas.map((f, i) => (
                  <tr key={i} className={f.estado === "nuevo" ? "" : "opacity-60"}>
                    <td className="px-3 py-2 font-medium">{f.nombre || "—"}</td>
                    <td className="hidden px-3 py-2 text-stone-500 sm:table-cell">{f.email ?? ""}</td>
                    <td className="hidden px-3 py-2 tabular-nums text-stone-500 sm:table-cell">{f.telefono ?? ""}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ETIQUETA[f.estado].c}`}>{ETIQUETA[f.estado].t}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {estado && !estado.ok && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{estado.mensaje}</p>}
        <form action={action} className="flex justify-end">
          <input type="hidden" name="filas" value={JSON.stringify(nuevos.map(({ nombre, email, telefono }) => ({ nombre, email, telefono })))} />
          <button disabled={pendiente || nuevos.length === 0} className={ui.btn}>
            {pendiente ? "Guardando…" : `Agregar ${nuevos.length || ""} ${nuevos.length === 1 ? "joven" : "jóvenes"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
