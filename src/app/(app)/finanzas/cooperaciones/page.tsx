import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { pesos } from "@/lib/dinero";
import { fechaLarga, hoy, sumarDias } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, type Cooperacion } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { crearCooperacion } from "../actions";

export const metadata = { title: "Cooperaciones" };

export default async function Cooperaciones() {
  const { supabase } = await requerir((p) => enEquipo(p, "finanzas"));
  const h = hoy();
  const [{ data: c }, { data: pagos }, { data: acts }] = await Promise.all([
    supabase.from("cooperaciones").select("id, concepto, monto, fecha_limite, actividad_id, cerrada").order("created_at", { ascending: false }),
    supabase.from("movimientos").select("cooperacion_id, monto").not("cooperacion_id", "is", null).eq("anulado", false),
    supabase.from("actividades").select("id, titulo, fecha").gte("fecha", sumarDias(h, -30)).order("fecha"),
  ]);
  const lista = (c ?? []) as Cooperacion[];
  const recaudado = new Map<string, number>();
  for (const p of (pagos ?? []) as { cooperacion_id: string; monto: number }[]) {
    recaudado.set(p.cooperacion_id, (recaudado.get(p.cooperacion_id) ?? 0) + Number(p.monto));
  }

  return (
    <div className="space-y-6">
      <Link href="/finanzas" className="text-sm text-stone-500 hover:text-titulo">← Finanzas</Link>
      <h1 className={ui.h1}>Cooperaciones</h1>

      <ul className="space-y-2">
        {lista.map((x) => (
          <li key={x.id}>
            <Link href={`/finanzas/cooperaciones/${x.id}`}
              className={`flex items-center gap-3 rounded-2xl border bg-superficie p-4 transition hover:border-oro/60 ${x.cerrada ? "border-dashed border-stone-300 opacity-70" : "border-stone-200/70"}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-titulo">{x.concepto}</span>
                <span className="text-xs text-stone-500">
                  {pesos(x.monto)} por persona
                  {x.cerrada ? " · cerrada" : x.fecha_limite ? ` · hasta el ${fechaLarga(x.fecha_limite)}` : ""}
                </span>
              </span>
              <span className="text-right leading-tight">
                <span className="block font-semibold tabular-nums text-green-700">{pesos(recaudado.get(x.id) ?? 0)}</span>
                <span className="text-[10px] uppercase tracking-wider text-stone-500">juntado</span>
              </span>
            </Link>
          </li>
        ))}
        {lista.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
            Todavía no hay cooperaciones. Crea la primera abajo.
          </p>
        )}
      </ul>

      <Formulario action={crearCooperacion} className={`${ui.card} space-y-4`}>
        <h2 className={ui.h2}>Nueva cooperación</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={`${ui.label} sm:col-span-2`}>¿Para qué?<input name="concepto" required placeholder="Retiro de diciembre" className={ui.input} /></label>
          <label className={ui.label}>Cuánto da cada quien<input name="monto" inputMode="decimal" required placeholder="$100" className={ui.input} /></label>
          <label className={ui.label}>Fecha límite <span className="font-normal text-stone-400">(opcional)</span>
            <input name="fecha_limite" type="date" className={ui.input} /></label>
          <label className={`${ui.label} sm:col-span-2`}>Actividad <span className="font-normal text-stone-400">(opcional)</span>
            <select name="actividad_id" defaultValue="" className={ui.input}>
              <option value="">— Ninguna —</option>
              {(acts ?? []).map((a: { id: string; titulo: string; fecha: string }) => (
                <option key={a.id} value={a.id}>{a.titulo} · {a.fecha.slice(8)}/{a.fecha.slice(5, 7)}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-stone-500">Les toca a todos los jóvenes activos. A quien no le toque, se le marca “No aplica” adentro.</p>
        <div className="flex justify-end"><Submit>Crear</Submit></div>
      </Formulario>
    </div>
  );
}
