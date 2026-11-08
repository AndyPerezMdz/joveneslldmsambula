import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { fechaLarga, horaBonita } from "@/lib/fechas";
import type { createClient } from "@/lib/supabase/server";
import type { Actividad } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { apuntarme, borrarTarea, cambiarVoluntario, crearTarea } from "./actions";
import { CopiarLink } from "./CopiarLink";

export type Tarea = { id: string; nombre: string; cupo: number | null; voluntarios: { joven_id: string; nombre: string }[] };
type Cliente = Awaited<ReturnType<typeof createClient>>;

export async function cargarTareas(supabase: Cliente, actividadId: string): Promise<Tarea[]> {
  const { data } = await supabase.from("tareas")
    .select("id, nombre, cupo, tarea_voluntarios(joven_id, created_at, jovenes(nombre))")
    .eq("actividad_id", actividadId).order("orden").order("created_at");
  type Cruda = { id: string; nombre: string; cupo: number | null;
    tarea_voluntarios: { joven_id: string; created_at: string; jovenes: { nombre: string } | null }[] };
  return ((data ?? []) as unknown as Cruda[]).map((t) => ({
    id: t.id, nombre: t.nombre, cupo: t.cupo,
    voluntarios: [...t.tarea_voluntarios].sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((v) => ({ joven_id: v.joven_id, nombre: v.jovenes?.nombre ?? "—" })),
  }));
}

/**
 * "¿Quién puede?" de una actividad.
 * Todos: se apuntan o se bajan. Admin: arma las tareas, agrega a los de WhatsApp y copia el link.
 */
export function Tareas({ a, tareas, miJoven, admin, jovenes = [], cerrado }: {
  a: Pick<Actividad, "id" | "titulo" | "fecha" | "hora">;
  tareas: Tarea[];
  miJoven: string | null;
  admin: boolean;
  jovenes?: { id: string; nombre: string }[];
  cerrado: boolean;
}) {
  if (!admin && tareas.length === 0) return null;
  const mensaje = `¿Quién puede? *${a.titulo}* · ${fechaLarga(a.fecha)}${a.hora ? `, ${horaBonita(a.hora)}` : ""}\n` +
    tareas.map((t) => `• ${t.nombre}${t.cupo ? ` (${t.cupo})` : ""}`).join("\n") +
    `\nApúntate aquí:`;

  return (
    <section className={`${ui.card} space-y-4`}>
      <div>
        <h2 className={ui.h2}>¿Quién puede?</h2>
        {cerrado && <p className={ui.ayuda}>Esta actividad ya pasó o se canceló: ya no se apunta nadie.</p>}
        {!cerrado && !admin && <p className={ui.ayuda}>Apúntate en lo que puedas ayudar. Si al final no puedes, bájate para que otro tome tu lugar.</p>}
      </div>

      {tareas.length === 0 && <p className="text-sm text-stone-500">Agrega lo que se necesita (ej. Vender, Cocinar, Acomodar sillas) y luego comparte el link.</p>}

      <ul className="space-y-3">
        {tareas.map((t) => {
          const yo = !!miJoven && t.voluntarios.some((v) => v.joven_id === miJoven);
          const lleno = t.cupo !== null && t.voluntarios.length >= t.cupo;
          const faltan = t.cupo !== null ? t.cupo - t.voluntarios.length : null;
          return (
            <li key={t.id} className={`rounded-2xl border p-3 ${yo ? "border-green-700/40 bg-green-50" : "border-stone-200/70"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-semibold text-titulo">{t.nombre}</span>
                  <span className={`text-xs ${lleno ? "text-green-700" : "text-stone-500"}`}>
                    {t.cupo === null ? `${t.voluntarios.length} apuntados` : lleno ? `Completo (${t.cupo})` : `Faltan ${faltan} de ${t.cupo}`}
                  </span>
                </span>
                {!cerrado && miJoven && (yo || !lleno) && (
                  <Formulario action={apuntarme}>
                    <input type="hidden" name="tarea_id" value={t.id} />
                    <input type="hidden" name="si" value={yo ? "false" : "true"} />
                    <Submit variante={yo ? "btnSec" : "btn"}>{yo ? "Ya no puedo" : "Yo puedo"}</Submit>
                  </Formulario>
                )}
              </div>
              {t.voluntarios.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {t.voluntarios.map((v) => (
                    <li key={v.joven_id} className="flex items-center gap-1 rounded-full bg-marca-claro py-0.5 pl-2.5 pr-1 text-xs font-medium text-titulo">
                      {v.nombre}
                      {admin ? (
                        <Formulario action={cambiarVoluntario} silencioso>
                          <input type="hidden" name="tarea_id" value={t.id} />
                          <input type="hidden" name="joven_id" value={v.joven_id} />
                          <input type="hidden" name="si" value="false" />
                          <button className="flex size-5 items-center justify-center rounded-full text-stone-400 hover:bg-white hover:text-red-600" aria-label={`Quitar a ${v.nombre}`}>✕</button>
                        </Formulario>
                      ) : <span className="w-1.5" />}
                    </li>
                  ))}
                </ul>
              )}
              {admin && (
                <div className="mt-3 space-y-1 border-t border-stone-200/70 pt-3">
                  <Formulario action={cambiarVoluntario} className="flex w-full items-end gap-2" silencioso>
                    <input type="hidden" name="tarea_id" value={t.id} />
                    <input type="hidden" name="si" value="true" />
                    <select name="joven_id" defaultValue="" aria-label="Agregar a alguien que dijo por WhatsApp" className={`${ui.input} mt-0 h-9 min-w-0 flex-1 text-sm`}>
                      <option value="" disabled>Dijo que sí por WhatsApp…</option>
                      {jovenes.filter((j) => !t.voluntarios.some((v) => v.joven_id === j.id)).map((j) => (
                        <option key={j.id} value={j.id}>{j.nombre}</option>
                      ))}
                    </select>
                    <Submit variante="btnSec">Agregar</Submit>
                  </Formulario>
                  <Formulario action={borrarTarea} className="flex justify-end">
                    <input type="hidden" name="id" value={t.id} />
                    <Submit variante="btnMini" confirmar={`¿Quitar la tarea "${t.nombre}"? También se borra quién se apuntó.`}>Quitar tarea</Submit>
                  </Formulario>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {admin && !cerrado && (
        <>
          <Formulario action={crearTarea} className="grid grid-cols-[1fr_6rem] items-end gap-2 sm:grid-cols-[1fr_6rem_auto]">
            <input type="hidden" name="actividad_id" value={a.id} />
            <label className={ui.label}>Se necesita
              <input name="nombre" required placeholder="Vender, Cocinar, Acomodar sillas…" className={`${ui.input} h-10`} />
            </label>
            <label className={ui.label}>¿Cuántos?
              <input name="cupo" type="number" min={1} max={200} placeholder="Todos" className={`${ui.input} h-10`} />
            </label>
            <div className="col-span-2 flex justify-end sm:col-span-1"><Submit variante="btnSec">+ Agregar</Submit></div>
          </Formulario>
          {tareas.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-oro-suave p-3">
              <p className="text-sm text-titulo">Pégalo en el grupo. Quien pueda, le pica y se apunta con su cuenta.</p>
              <CopiarLink ruta={`/apuntarse/${a.id}`} mensaje={mensaje} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
