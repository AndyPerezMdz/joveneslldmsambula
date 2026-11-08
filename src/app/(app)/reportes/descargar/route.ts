import { hoy, mesVecino } from "@/lib/fechas";
import { getSesion } from "@/lib/supabase/server";
import { enEquipo, SELECT_MOV, type Movimiento } from "@/lib/tipos";

/**
 * Reporte del mes en CSV (se abre directo en Excel).
 *   ?que=asistencia → una fila por joven, una columna por actividad (✓ si vino)
 *   ?que=finanzas   → todos los movimientos del mes, anulados incluidos
 */
const celda = (v: string | number | null | undefined) => {
  const t = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const csv = (filas: (string | number | null | undefined)[][]) => "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
const ddmm = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

export async function GET(req: Request) {
  const { supabase, perfil } = await getSesion();
  const u = new URL(req.url);
  const que = u.searchParams.get("que");
  const q = u.searchParams.get("mes") ?? "";
  const mes = /^\d{4}-\d{2}$/.test(q) ? q : hoy().slice(0, 7);
  const ini = `${mes}-01`;
  const fin = `${mesVecino(mes, 1)}-01`;
  const no = () => new Response("No tienes permiso para descargar esto.", { status: 403 });

  let cuerpo = "";
  if (que === "asistencia") {
    if (!perfil || !enEquipo(perfil, "asistencia")) return no();
    const [{ data: a }, { data: s }, { data: j }] = await Promise.all([
      supabase.from("actividades").select("id, titulo, fecha, hora").eq("cancelada", false)
        .gte("fecha", ini).lt("fecha", fin).lte("fecha", hoy()).order("fecha").order("hora", { nullsFirst: true }),
      supabase.from("asistencias").select("actividad_id, joven_id, actividades!inner(fecha)")
        .gte("actividades.fecha", ini).lt("actividades.fecha", fin),
      supabase.rpc("resumen_jovenes", { p_semanas: 8 }),
    ]);
    const acts = (a ?? []) as { id: string; titulo: string; fecha: string; hora: string | null }[];
    const vino = new Set(((s ?? []) as { actividad_id: string; joven_id: string }[]).map((x) => `${x.joven_id}:${x.actividad_id}`));
    const jovenes = ((j ?? []) as { joven_id: string; nombre: string; activo: boolean }[])
      .filter((x) => x.activo || acts.some((ac) => vino.has(`${x.joven_id}:${ac.id}`)))
      .sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
    const filas: (string | number)[][] = [["Nombre", ...acts.map((ac) => `${ddmm(ac.fecha)} ${ac.titulo}`), "Total"]];
    for (const x of jovenes) {
      const marcas = acts.map((ac) => (vino.has(`${x.joven_id}:${ac.id}`) ? "✓" : ""));
      filas.push([x.nombre, ...marcas, marcas.filter(Boolean).length]);
    }
    filas.push(["Vinieron", ...acts.map((ac) => jovenes.filter((x) => vino.has(`${x.joven_id}:${ac.id}`)).length), ""]);
    cuerpo = csv(filas);
  } else if (que === "finanzas") {
    if (!perfil || !enEquipo(perfil, "finanzas")) return no();
    const [{ data: m }, { data: c }, { data: a }] = await Promise.all([
      supabase.from("movimientos").select(SELECT_MOV).gte("fecha", ini).lt("fecha", fin).order("fecha").order("created_at"),
      supabase.from("categorias").select("id, nombre"),
      supabase.from("actividades").select("id, titulo").gte("fecha", sumarMes(ini, -3)).lt("fecha", fin),
    ]);
    const cats = new Map(((c ?? []) as { id: string; nombre: string }[]).map((x) => [x.id, x.nombre]));
    const acts = new Map(((a ?? []) as { id: string; titulo: string }[]).map((x) => [x.id, x.titulo]));
    const filas: (string | number | null)[][] = [["Fecha", "Tipo", "Categoría", "Concepto", "Monto", "Actividad", "Anulado", "Motivo"]];
    for (const x of (m ?? []) as Movimiento[]) {
      filas.push([
        `${ddmm(x.fecha)}/${x.fecha.slice(0, 4)}`, x.tipo === "entrada" ? "Entrada" : "Salida",
        cats.get(x.categoria) ?? x.categoria, x.concepto,
        (x.tipo === "entrada" ? 1 : -1) * Number(x.monto),
        x.actividad_id ? acts.get(x.actividad_id) ?? "" : "", x.anulado ? "Sí" : "", x.anulado_motivo ?? "",
      ]);
    }
    cuerpo = csv(filas);
  } else {
    return new Response("¿Qué reporte?", { status: 400 });
  }

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${que}-${mes}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Primer día de un mes vecino ("2026-11-01", -3 → "2026-08-01"). */
function sumarMes(ini: string, n: number) {
  return `${mesVecino(ini.slice(0, 7), n)}-01`;
}
