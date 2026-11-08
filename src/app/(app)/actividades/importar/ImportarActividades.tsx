"use client";

import { useMemo, useState } from "react";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { fechaLarga } from "@/lib/fechas";
import { leerActividades, type Propuesta } from "@/lib/importarActividades";
import { normalizar } from "@/lib/nombres";
import { TIPOS, type TipoActividad } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { crearActividades } from "../actions";

type Fila = Propuesta & { incluir: boolean; repetida: boolean; lugar: string };

const EJEMPLO = `Se envía la información de las actividades del mes de Noviembre
2 de Nov - Consagración especial de inicio de mes
10 de Nov - Venta de donas
16 de Nov - Actividad deportiva de 4 a 7 pm`;

/** Pegar el mensaje → revisar lo que entendió → crear todas. */
export function ImportarActividades({ hoy, existentes }: { hoy: string; existentes: { fecha: string; titulo: string }[] }) {
  const [texto, setTexto] = useState("");
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const ya = useMemo(() => new Set(existentes.map((e) => `${e.fecha}|${normalizar(e.titulo)}`)), [existentes]);

  function leer() {
    const p = leerActividades(texto, hoy);
    setFilas(p.map((x) => {
      const repetida = ya.has(`${x.fecha}|${normalizar(x.titulo)}`);
      return { ...x, lugar: "", repetida, incluir: !repetida };
    }));
  }
  const cambiar = (i: number, c: Partial<Fila>) => setFilas((f) => f!.map((x, j) => (j === i ? { ...x, ...c } : x)));
  const elegidas = (filas ?? []).filter((x) => x.incluir && x.titulo.trim());

  if (!filas) {
    return (
      <div className={`${ui.card} space-y-4`}>
        <label className={ui.label}>
          Pega aquí el mensaje con las actividades
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={10} placeholder={EJEMPLO} className={`${ui.input} font-mono text-sm`} />
        </label>
        <p className={ui.ayuda}>
          Una actividad por renglón, empezando con la fecha (&quot;10 de Nov - Venta de donas&quot;, &quot;10/11 Venta&quot;).
          Si trae hora (&quot;de 4 a 7 pm&quot;, &quot;a las 5&quot;), también la toma. Lo demás (saludos, avisos) se ignora.
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={leer} disabled={!texto.trim()} className={ui.btnOro}>Leer actividades</button>
        </div>
      </div>
    );
  }

  return (
    <Formulario action={crearActividades} className="space-y-4">
      <input type="hidden" name="filas" value={JSON.stringify(elegidas.map(({ fecha, titulo, tipo, hora, hora_fin, lugar, notas }) => ({ fecha, titulo, tipo, hora, hora_fin, lugar, notas })))} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">
          {filas.length === 0 ? "No encontré ninguna fecha en el texto." : `Encontré ${filas.length}. Revisa y corrige lo que haga falta.`}
        </p>
        <button type="button" onClick={() => setFilas(null)} className={ui.btnMini}>← Cambiar el texto</button>
      </div>

      <ul className="space-y-3">
        {filas.map((x, i) => (
          <li key={i} className={`rounded-2xl border bg-superficie p-4 ${x.incluir ? "border-stone-200/70" : "border-dashed border-stone-300 opacity-60"}`}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-titulo first-letter:uppercase">
                <input type="checkbox" checked={x.incluir} onChange={(e) => cambiar(i, { incluir: e.target.checked })} className="size-4" />
                {fechaLarga(x.fecha)}
              </label>
              {x.repetida && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Ya existe</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <label className={`${ui.label} col-span-2 sm:col-span-4`}>Nombre
                <input value={x.titulo} onChange={(e) => cambiar(i, { titulo: e.target.value })} className={`${ui.input} h-10`} />
              </label>
              <label className={`${ui.label} col-span-2`}>Tipo
                <select value={x.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value as TipoActividad })} className={`${ui.input} h-10`}>
                  {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}
                </select>
              </label>
              <label className={`${ui.label} col-span-2`}>Fecha
                <input type="date" value={x.fecha} onChange={(e) => cambiar(i, { fecha: e.target.value })} className={`${ui.input} h-10`} />
              </label>
              <label className={ui.label}>Empieza
                <input type="time" value={x.hora} onChange={(e) => cambiar(i, { hora: e.target.value })} className={`${ui.input} h-10`} />
              </label>
              <label className={ui.label}>Termina
                <input type="time" value={x.hora_fin} onChange={(e) => cambiar(i, { hora_fin: e.target.value })} className={`${ui.input} h-10`} />
              </label>
              <label className={`${ui.label} col-span-2`}>Lugar
                <input value={x.lugar} onChange={(e) => cambiar(i, { lugar: e.target.value })} placeholder="Templo…" className={`${ui.input} h-10`} />
              </label>
              {x.notas && (
                <label className={`${ui.label} col-span-2 sm:col-span-6`}>Notas
                  <textarea value={x.notas} rows={2} onChange={(e) => cambiar(i, { notas: e.target.value })} className={ui.input} />
                </label>
              )}
            </div>
          </li>
        ))}
      </ul>

      {elegidas.length > 0 && (
        <div className="sticky bottom-20 flex items-center justify-between gap-3 rounded-2xl bg-marca p-3 pl-4 text-sm text-white shadow-xl lg:bottom-4">
          <span>{elegidas.length === 1 ? "1 actividad" : `${elegidas.length} actividades`} por crear</span>
          <Submit variante="btnOro">Crear {elegidas.length === 1 ? "actividad" : "actividades"}</Submit>
        </div>
      )}
    </Formulario>
  );
}
