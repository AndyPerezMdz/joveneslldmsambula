"use client";

import { useState } from "react";
import { CATEGORIAS, type TipoMov } from "@/lib/tipos";
import { ui } from "@/lib/ui";

/** Entrada/salida cambia las categorías que se ofrecen. */
export function CamposMovimiento({ tipoInicial, fecha, actividades, actividad }: {
  tipoInicial: TipoMov;
  fecha: string;
  actividades: { id: string; titulo: string; fecha: string }[];
  actividad?: string;
}) {
  const [tipo, setTipo] = useState<TipoMov>(tipoInicial);
  const cats = CATEGORIAS.filter((c) => c.para === tipo || c.para === "ambos");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className={ui.label}>¿Entró o salió dinero?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["entrada", "salida"] as const).map((t) => (
            <label key={t} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold transition ${
              tipo === t
                ? t === "entrada" ? "border-green-700 bg-green-50 text-green-800" : "border-red-600 bg-red-50 text-red-700"
                : "border-stone-200 text-stone-500"
            }`}>
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
              {t === "entrada" ? "+ Entró" : "− Salió"}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={ui.label}>
        Monto
        <input name="monto" inputMode="decimal" required placeholder="$0.00" className={`${ui.input} text-lg font-semibold tabular-nums`} />
      </label>
      <label className={ui.label}>
        Categoría
        <select key={tipo} name="categoria" defaultValue={cats[0].v} className={ui.input}>
          {cats.map((c) => <option key={c.v} value={c.v}>{c.n}</option>)}
        </select>
      </label>
      <label className={`${ui.label} sm:col-span-2`}>
        Concepto
        <input name="concepto" required placeholder={tipo === "entrada" ? "Venta de tamales, ofrenda especial…" : "Masa y hojas, gasolina…"} className={ui.input} />
      </label>
      <label className={ui.label}>
        Fecha
        <input name="fecha" type="date" required defaultValue={fecha} className={ui.input} />
      </label>
      <label className={ui.label}>
        Actividad <span className="font-normal text-stone-400">(opcional)</span>
        <select name="actividad_id" defaultValue={actividad ?? ""} className={ui.input}>
          <option value="">— Ninguna —</option>
          {actividades.map((a) => <option key={a.id} value={a.id}>{a.titulo} · {a.fecha.slice(8)}/{a.fecha.slice(5, 7)}</option>)}
        </select>
      </label>
    </div>
  );
}
