import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { fechaLarga, horaBonita, hoy } from "@/lib/fechas";
import { requerirMiembro } from "@/lib/supabase/server";
import { Album } from "@/components/Album";
import { pesos } from "@/lib/dinero";
import { driveListo, fotosDrive, repartir, type Foto } from "@/lib/drive";
import { enEquipo, puedeOrganizar, SELECT_MOV, tipo, type Actividad, type Movimiento, type ResumenJoven } from "@/lib/tipos";
import { MovimientoFila } from "../../finanzas/MovimientoFila";
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

  // Fotos de esta actividad (desde Drive)
  let fotos: Foto[] = [];
  if (driveListo() && enEquipo(perfil, "evidencias")) {
    try {
      const todas = await fotosDrive();
      const delDia = todas.filter((f) => f.fecha === a.fecha);
      if (delDia.length) {
        const { data: mismas } = await supabase.from("actividades").select("id, fecha, hora").eq("fecha", a.fecha);
        fotos = repartir(delDia, mismas ?? []).album.get(a.id) ?? [];
      }
    } catch { /* si Drive falla, la actividad se ve igual */ }
  }

  // Dinero de esta actividad (equipo de finanzas)
  const veDinero = enEquipo(perfil, "finanzas");
  let movs: Movimiento[] = [];
  const catNombre = new Map<string, string>();
  if (veDinero) {
    const [{ data }, { data: cs }] = await Promise.all([
      supabase.from("movimientos").select(SELECT_MOV).eq("actividad_id", a.id).order("created_at"),
      supabase.from("categorias").select("id, nombre"),
    ]);
    movs = (data ?? []) as Movimiento[];
    for (const c of (cs ?? []) as { id: string; nombre: string }[]) catNombre.set(c.id, c.nombre);
  }
  const validos = movs.filter((m) => !m.anulado);
  const entro = validos.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.monto), 0);
  const salio = validos.filter((m) => m.tipo === "salida").reduce((s, m) => s + Number(m.monto), 0);

  return (
    <div className="space-y-6">
      <Link href="/actividades" className="text-sm text-stone-500 hover:text-titulo">← Actividades</Link>

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

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
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

      {fotos.length > 0 && (
        <section className="space-y-3">
          <h2 className={ui.h2}>Fotos ({fotos.length})</h2>
          <Album fotos={fotos} />
        </section>
      )}

        </div>
        <div className="space-y-5 lg:col-span-2">
      {veDinero && (
        <section className={`${ui.card} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={ui.h2}>Dinero de esta actividad</h2>
            <Link href={`/finanzas/nuevo?actividad=${a.id}`} className={ui.btnMini}>+ Registrar</Link>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-green-50 p-2"><p className="text-[11px] text-green-800">Entró</p><p className="font-semibold tabular-nums text-green-700">{pesos(entro)}</p></div>
            <div className="rounded-xl bg-red-50 p-2"><p className="text-[11px] text-red-700">Salió</p><p className="font-semibold tabular-nums text-red-700">{pesos(salio)}</p></div>
            <div className="rounded-xl bg-marca-claro p-2"><p className="text-[11px] text-titulo">{entro - salio >= 0 ? "Ganancia" : "Pérdida"}</p><p className="font-semibold tabular-nums text-titulo">{pesos(Math.abs(entro - salio))}</p></div>
          </div>
          {movs.length > 0 && (
            <ul className="-mx-5 divide-y divide-stone-200/70 border-t border-stone-200/70">
              {movs.map((m) => <MovimientoFila key={m.id} m={m} puedeAnular categoria={catNombre.get(m.categoria) ?? m.categoria} />)}
            </ul>
          )}
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
      </div>
    </div>
  );
}
