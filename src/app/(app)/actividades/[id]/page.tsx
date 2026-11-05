import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { fechaLarga, horaBonita, hoy } from "@/lib/fechas";
import { requerirMiembro } from "@/lib/supabase/server";
import { enEquipo, puedeOrganizar, tipo, type Actividad, type ResumenJoven } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { ActividadCampos } from "../ActividadCampos";
import { actualizarActividad, agregarYMarcar, borrarActividad } from "../actions";
import { PaseLista } from "./PaseLista";

export const metadata = { title: "Actividad" };

export default async function DetalleActividad({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil } = await requerirMiembro();

  const { data: a } = await supabase
    .from("actividades")
    .select("id, titulo, tipo, fecha, hora, lugar, notas")
    .eq("id", id)
    .maybeSingle<Actividad>();
  if (!a) notFound();

  const t = tipo(a.tipo);
  const pasaLista = enEquipo(perfil, "asistencia");

  let lista: ResumenJoven[] = [];
  let presentes: string[] = [];
  if (pasaLista) {
    const [{ data: r }, { data: asis }] = await Promise.all([
      supabase.rpc("resumen_jovenes", { p_semanas: 8 }),
      supabase.from("asistencias").select("joven_id").eq("actividad_id", a.id),
    ]);
    presentes = (asis ?? []).map((x: { joven_id: string }) => x.joven_id);
    // Activos + los inactivos que sí vinieron a esta actividad
    lista = ((r ?? []) as ResumenJoven[]).filter((j) => j.activo || presentes.includes(j.joven_id));
  }

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-stone-500 hover:text-titulo">← Actividades</Link>

      <div>
        <span className="chip chip-texto inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ ["--c" as string]: t.color }}>
          {t.n}
        </span>
        <h1 className={`${ui.h1} mt-2`}>{a.titulo}</h1>
        <p className="mt-1 text-stone-500 first-letter:uppercase">
          {fechaLarga(a.fecha)}
          {a.hora && ` · ${horaBonita(a.hora)}`}
          {a.lugar && ` · ${a.lugar}`}
        </p>
        {a.notas && <p className="mt-3 whitespace-pre-line text-sm">{a.notas}</p>}
      </div>

      {pasaLista && (
        <section className="space-y-3">
          <PaseLista
            key={lista.length}
            actividadId={a.id}
            jovenes={lista.map((j) => ({ id: j.joven_id, nombre: j.nombre, recientes: j.recientes, ultima: j.ultima }))}
            presentesIniciales={presentes}
            hoy={hoy()}
          />
          <Formulario action={agregarYMarcar} className={`${ui.card} space-y-3`}>
            <input type="hidden" name="actividad_id" value={a.id} />
            <label className={ui.label}>
              ¿Llegó alguien que no está en la lista?
              <input name="nombre" required placeholder="Nombre completo" className={ui.input} />
            </label>
            <div className="flex justify-end"><Submit variante="btnSec">Agregar y marcar</Submit></div>
          </Formulario>
        </section>
      )}

      {puedeOrganizar(perfil) && (
        <details className={`${ui.card} group`}>
          <summary className="cursor-pointer list-none font-semibold text-titulo">
            Editar actividad <span className="text-stone-400 group-open:hidden">▾</span>
          </summary>
          <Formulario action={actualizarActividad} className="mt-5 space-y-6">
            <input type="hidden" name="id" value={a.id} />
            <ActividadCampos a={a} />
            <div className="flex justify-end"><Submit>Guardar</Submit></div>
          </Formulario>
          <Formulario action={borrarActividad} className="mt-4 border-t border-stone-200 pt-4">
            <input type="hidden" name="id" value={a.id} />
            <Submit variante="btnPeligro" confirmar="¿Borrar esta actividad? También se borra su asistencia. No se puede deshacer.">
              Borrar actividad
            </Submit>
          </Formulario>
        </details>
      )}
    </div>
  );
}
