import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { Encabezado } from "@/components/Tarjeta";
import { horaBonita } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { DIAS_CORTOS, esAdmin, TIPOS, type Horario } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { actualizarHorario, crearHorario } from "../actions";

export const metadata = { title: "Horarios fijos" };

function Campos({ h }: { h?: Horario }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <label className={ui.label}>Nombre<input name="titulo" required defaultValue={h?.titulo} placeholder="Oración de 5" className={`${ui.input} h-10`} /></label>
        <label className={ui.label}>Tipo
          <select name="tipo" defaultValue={h?.tipo ?? "culto"} className={`${ui.input} h-10`}>
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}
          </select>
        </label>
      </div>
      <fieldset>
        <legend className={ui.label}>Días</legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <label key={d} className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-stone-200 text-sm font-semibold text-stone-500 has-[:checked]:border-marca has-[:checked]:bg-marca has-[:checked]:text-white">
              <input type="checkbox" name="dias" value={d} defaultChecked={h ? h.dias.includes(d) : true} className="sr-only" />
              {DIAS_CORTOS[d]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className={ui.label}>Empieza<input name="hora" type="time" required defaultValue={h?.hora.slice(0, 5)} className={`${ui.input} h-10`} /></label>
        <label className={ui.label}>Termina
          <input name="hora_fin" type="time" defaultValue={h?.hora_fin?.slice(0, 5) ?? ""} className={`${ui.input} h-10`} /></label>
        <label className={`${ui.label} col-span-2 sm:col-span-1`}>Lugar
          <input name="lugar" placeholder="Templo" defaultValue={h?.lugar ?? ""} className={`${ui.input} h-10`} /></label>
      </div>
    </div>
  );
}

export default async function Horarios() {
  const { supabase } = await requerir(esAdmin);
  const { data } = await supabase.from("horarios").select("id, titulo, tipo, dias, hora, hora_fin, lugar, activo").order("hora");
  const lista = (data ?? []) as Horario[];
  const dias = (h: Horario) => (h.dias.length === 7 ? "Diario" : [...h.dias].sort().map((d) => DIAS_CORTOS[d]).join(", "));

  return (
    <>
      <Link href="/actividades" className="text-sm text-stone-500 hover:text-titulo">← Actividades</Link>
      <div className="mt-2">
        <Encabezado titulo="Horarios fijos" sub="Cada horario crea su actividad sola en esos días, lista para pasar lista. Si cambias uno, se ajustan las que vienen (las que ya tienen asistencia se quedan como estaban)." />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <ul className="space-y-3 lg:col-span-2">
          {lista.map((h) => (
            <li key={h.id}>
              <details className={`group rounded-3xl border border-stone-200/70 bg-superficie shadow-[0_1px_2px_rgb(23_32_44/0.04)] ${h.activo ? "" : "opacity-60"}`}>
                <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
                  <span className="w-24 shrink-0 whitespace-nowrap text-right">
                    <span className="block font-semibold tabular-nums text-titulo">{horaBonita(h.hora)}</span>
                    {h.hora_fin && <span className="text-xs text-stone-500">a {horaBonita(h.hora_fin)}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{h.titulo}{!h.activo && <span className="ml-2 text-xs font-normal text-stone-400">pausado</span>}</span>
                    <span className="text-sm text-stone-500">{dias(h)}</span>
                  </span>
                  <span className="text-xs font-semibold text-oro group-open:hidden">Editar</span>
                </summary>
                <Formulario action={actualizarHorario} className="space-y-4 border-t border-stone-200/70 p-4">
                  <input type="hidden" name="id" value={h.id} />
                  <Campos h={h} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="activo" defaultChecked={h.activo} className="size-4" /> Activo
                    </label>
                    <Submit>Guardar</Submit>
                  </div>
                </Formulario>
              </details>
            </li>
          ))}
        </ul>

        <Formulario action={crearHorario} className={`${ui.card} space-y-4 lg:sticky lg:top-8`}>
          <h2 className={ui.h2}>Nuevo horario</h2>
          <Campos />
          <Submit>Agregar</Submit>
        </Formulario>
      </div>
    </>
  );
}
