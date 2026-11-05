import Link from "next/link";
import { Encabezado } from "@/components/Tarjeta";
import { TarjetaActividad } from "@/components/TarjetaActividad";
import { hoy } from "@/lib/fechas";
import { requerirMiembro } from "@/lib/supabase/server";
import { enEquipo, puedeOrganizar, type Actividad } from "@/lib/tipos";
import { ui } from "@/lib/ui";

export const metadata = { title: "Actividades" };

type Fila = Actividad & { asistencias: { count: number }[] };

const nombreMes = (f: string) =>
  new Date(`${f.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("es-MX", { timeZone: "UTC", month: "long", year: "numeric" });

export default async function Actividades({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { supabase, perfil } = await requerirMiembro();
  const { ver } = await searchParams;
  const pasadas = ver === "pasadas";
  const h = hoy();
  const veLista = enEquipo(perfil, "asistencia");

  let q = supabase.from("actividades").select("id, titulo, tipo, fecha, hora, lugar, notas, asistencias(count)");
  q = pasadas ? q.lt("fecha", h).order("fecha", { ascending: false }).limit(120) : q.gte("fecha", h).order("fecha").limit(120);
  const { data } = await q.order("hora", { nullsFirst: true });
  const filas = (data ?? []) as Fila[];

  // Agrupadas por mes
  const meses = new Map<string, Fila[]>();
  for (const a of filas) meses.set(a.fecha.slice(0, 7), [...(meses.get(a.fecha.slice(0, 7)) ?? []), a]);

  return (
    <>
      <Encabezado titulo="Actividades">
        {puedeOrganizar(perfil) && <Link href="/actividades/nueva" className={ui.btnOro}>+ Nueva actividad</Link>}
      </Encabezado>

      <div className="mb-5 inline-flex rounded-xl border border-stone-200 bg-superficie p-1 text-sm">
        {[{ v: "", n: "Próximas" }, { v: "pasadas", n: "Pasadas" }].map((t) => (
          <Link key={t.n} href={t.v ? `/actividades?ver=${t.v}` : "/actividades"}
            className={`rounded-lg px-4 py-1.5 font-medium transition ${(t.v === "pasadas") === pasadas ? "bg-marca text-white" : "text-stone-500 hover:text-titulo"}`}>
            {t.n}
          </Link>
        ))}
      </div>

      {filas.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          {pasadas ? "Todavía no hay actividades pasadas." : "No hay actividades programadas."}
        </p>
      ) : (
        <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
          {[...meses.entries()].map(([mes, lista]) => (
            <section key={mes} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-oro">{nombreMes(mes)}</h2>
              {lista.map((a) => (
                <TarjetaActividad key={a.id} a={a} destacada={a.fecha === h} extra={veLista && a.fecha <= h ? (
                  <span className="shrink-0 text-right leading-tight">
                    <span className="block text-lg font-semibold tabular-nums text-titulo">{a.asistencias[0]?.count ?? 0}</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500">vinieron</span>
                  </span>
                ) : null} />
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
