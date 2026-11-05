import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { haceCuanto, hoy, semanasEntre } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, SEMANAS_ALERTA, type ResumenJoven } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { actualizarJoven, borrarJoven, crearJoven } from "./actions";

export const metadata = { title: "Jóvenes" };

type Ficha = { id: string; email: string | null; telefono: string | null; perfil_id: string | null };

export default async function Jovenes() {
  const { supabase } = await requerir((p) => enEquipo(p, "asistencia"));
  const h = hoy();

  const [{ data: r }, { data: f }] = await Promise.all([
    supabase.rpc("resumen_jovenes", { p_semanas: 8 }),
    supabase.from("jovenes").select("id, email, telefono, perfil_id"),
  ]);
  const fichas = new Map(((f ?? []) as Ficha[]).map((x) => [x.id, x]));
  const lista = ((r ?? []) as ResumenJoven[]).sort(
    (a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, "es"),
  );
  const activos = lista.filter((j) => j.activo).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Jóvenes</h1>
        <p className={ui.ayuda}>{activos} activos · asistencia de las últimas 8 semanas</p>
      </div>

      <Formulario action={crearJoven} className={`${ui.card} space-y-4`}>
        <h2 className={ui.h2}>Agregar joven</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={ui.label}>Nombre<input name="nombre" required className={ui.input} /></label>
          <label className={ui.label}>Correo <span className="font-normal text-stone-400">(opcional)</span>
            <input name="email" type="email" className={ui.input} /></label>
          <label className={ui.label}>Teléfono <span className="font-normal text-stone-400">(opcional)</span>
            <input name="telefono" type="tel" className={ui.input} /></label>
        </div>
        <p className="text-xs text-stone-500">Si pones su correo y algún día crea cuenta con él, se liga solo y puede ver su asistencia.</p>
        <div className="flex justify-end"><Submit>Agregar</Submit></div>
      </Formulario>

      <ul className="space-y-2">
        {lista.map((j) => {
          const x = fichas.get(j.joven_id);
          const semanas = j.ultima ? semanasEntre(j.ultima, h) : null;
          const alerta = j.activo && semanas !== null && semanas >= SEMANAS_ALERTA;
          return (
            <li key={j.joven_id}>
              <details className={`group rounded-2xl border bg-superficie ${j.activo ? "border-stone-200/70" : "border-dashed border-stone-300 opacity-70"}`}>
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 pr-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {j.nombre}
                      {x?.perfil_id && <span className="ml-2 rounded-full bg-marca-claro px-2 py-0.5 text-[10px] font-semibold text-titulo">con cuenta</span>}
                      {!j.activo && <span className="ml-2 text-xs text-stone-400">inactivo</span>}
                    </span>
                    <span className={`text-xs ${alerta ? "font-medium text-red-600" : "text-stone-500"}`}>
                      {j.ultima ? `Última vez ${haceCuanto(j.ultima, h)}` : "Nunca ha venido"}
                    </span>
                  </span>
                  <span className="text-right leading-tight">
                    <span className="block text-lg font-semibold tabular-nums text-titulo">{j.recientes}</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500">8 sem.</span>
                  </span>
                </summary>
                <div className="border-t border-stone-200 p-4">
                  <Formulario action={actualizarJoven} className="space-y-4">
                    <input type="hidden" name="id" value={j.joven_id} />
                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className={ui.label}>Nombre<input name="nombre" required defaultValue={j.nombre} className={ui.input} /></label>
                      <label className={ui.label}>Correo<input name="email" type="email" defaultValue={x?.email ?? ""} className={ui.input} /></label>
                      <label className={ui.label}>Teléfono<input name="telefono" type="tel" defaultValue={x?.telefono ?? ""} className={ui.input} /></label>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="activo" defaultChecked={j.activo} className="size-4" />
                      Activo (sale en el pase de lista)
                    </label>
                    <p className="text-xs text-stone-500">Ha venido {j.total} {j.total === 1 ? "vez" : "veces"} en total.</p>
                    <div className="flex flex-wrap justify-end gap-2"><Submit>Guardar</Submit></div>
                  </Formulario>
                  <Formulario action={borrarJoven} className="mt-3 flex justify-end">
                    <input type="hidden" name="id" value={j.joven_id} />
                    <Submit variante="btnPeligro" confirmar={`¿Borrar a ${j.nombre}? Se borra también toda su asistencia. Si solo dejó de venir, mejor márcalo como inactivo.`}>
                      Borrar
                    </Submit>
                  </Formulario>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
