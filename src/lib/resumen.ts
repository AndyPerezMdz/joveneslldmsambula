import type { createClient } from "@/lib/supabase/server";
import { sumarDias } from "@/lib/fechas";

type Cliente = Awaited<ReturnType<typeof createClient>>;

/** Lunes de la semana de una fecha "YYYY-MM-DD". */
export function lunes(f: string) {
  const d = new Date(`${f}T12:00:00Z`);
  return sumarDias(f, -((d.getUTCDay() + 6) % 7));
}

type FilaAsis = { joven_id: string; actividades: { fecha: string; tipo: string } };

/**
 * Asistencia entre dos fechas: jóvenes distintos por semana y promedio por culto.
 * (Solo cuenta lo que el RLS deja ver: úsalo con equipo de asistencia o encargados.)
 */
export async function asistenciaEntre(supabase: Cliente, desde: string, hasta: string) {
  const [{ data: asis }, { data: acts }] = await Promise.all([
    supabase.from("asistencias").select("joven_id, actividades!inner(fecha, tipo)")
      .gte("actividades.fecha", desde).lte("actividades.fecha", hasta),
    supabase.from("actividades").select("id, tipo, fecha").gte("fecha", desde).lte("fecha", hasta),
  ]);
  const filas = (asis ?? []) as unknown as FilaAsis[];
  const semanas: string[] = [];
  for (let s = lunes(desde); s <= hasta; s = sumarDias(s, 7)) semanas.push(s);
  const porSemana = new Map(semanas.map((s) => [s, new Set<string>()]));
  for (const a of filas) porSemana.get(lunes(a.actividades.fecha))?.add(a.joven_id);

  const cultos = (acts ?? []).filter((a: { tipo: string }) => a.tipo === "culto").length;
  const enCultos = filas.filter((a) => a.actividades.tipo === "culto").length;
  return {
    semanas,
    serie: semanas.map((s) => porSemana.get(s)!.size),
    promedioCulto: cultos ? Math.round(enCultos / cultos) : 0,
    actividades: (acts ?? []).length,
    distintos: new Set(filas.map((a) => a.joven_id)).size,
  };
}
