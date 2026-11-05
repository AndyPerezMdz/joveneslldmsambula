import Link from "next/link";
import { driveListo, espacioDrive, fotosDrive } from "@/lib/drive";
import { pesos } from "@/lib/dinero";
import { haceCuanto, hoy, semanasEntre, sumarDias } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { esEncargado, SEMANAS_ALERTA, type ResumenJoven } from "@/lib/tipos";
import { ui } from "@/lib/ui";

export const metadata = { title: "Panel" };

const SEMANAS = 8;

/** Lunes de la semana de una fecha "YYYY-MM-DD" */
function lunes(f: string) {
  const d = new Date(`${f}T12:00:00Z`);
  const dia = (d.getUTCDay() + 6) % 7;
  return sumarDias(f, -dia);
}

export default async function Panel() {
  const { supabase } = await requerir(esEncargado);
  const h = hoy();
  const desde = sumarDias(lunes(h), -7 * (SEMANAS - 1));

  const [{ data: asis }, { data: acts }, { data: saldo }, { data: resumen }, { data: coops }, { data: pagos }] = await Promise.all([
    supabase.from("asistencias").select("joven_id, actividades!inner(fecha, tipo)").gte("actividades.fecha", desde).lte("actividades.fecha", h),
    supabase.from("actividades").select("id, tipo, fecha").gte("fecha", desde).lte("fecha", h),
    supabase.rpc("saldo"),
    supabase.rpc("resumen_jovenes", { p_semanas: SEMANAS }),
    supabase.from("cooperaciones").select("id, concepto, monto").eq("cerrada", false),
    supabase.from("movimientos").select("cooperacion_id, monto").not("cooperacion_id", "is", null).eq("anulado", false),
  ]);

  // Jóvenes distintos por semana
  const semanas = Array.from({ length: SEMANAS }, (_, i) => sumarDias(desde, i * 7));
  const porSemana = new Map(semanas.map((s) => [s, new Set<string>()]));
  type Fila = { joven_id: string; actividades: { fecha: string; tipo: string } };
  for (const a of (asis ?? []) as unknown as Fila[]) porSemana.get(lunes(a.actividades.fecha))?.add(a.joven_id);
  const serie = semanas.map((s) => porSemana.get(s)!.size);

  // Promedio por culto
  const cultos = (acts ?? []).filter((a: { tipo: string }) => a.tipo === "culto").map((a: { id: string }) => a.id);
  const asisCultos = ((asis ?? []) as unknown as Fila[]).filter((a) => a.actividades.tipo === "culto").length;
  const promedio = cultos.length ? Math.round(asisCultos / cultos.length) : 0;

  const jovenes = (resumen ?? []) as ResumenJoven[];
  const activos = jovenes.filter((j) => j.activo);
  const perdidos = activos
    .filter((j) => j.ultima && semanasEntre(j.ultima, h) >= SEMANAS_ALERTA)
    .sort((a, b) => (a.ultima! < b.ultima! ? -1 : 1));

  // Cooperaciones: cuánto falta juntar
  const juntado = new Map<string, number>();
  for (const p of (pagos ?? []) as { cooperacion_id: string; monto: number }[]) juntado.set(p.cooperacion_id, (juntado.get(p.cooperacion_id) ?? 0) + Number(p.monto));

  // Fotos del mes
  let fotosMes: number | null = null;
  let drive: { usado: number; limite: number | null } | null = null;
  if (driveListo()) {
    try {
      const [fs, e] = await Promise.all([fotosDrive(), espacioDrive()]);
      fotosMes = fs.filter((f) => f.fecha.startsWith(h.slice(0, 7))).length;
      drive = e;
    } catch { /* si Drive falla, el panel sigue */ }
  }

  // Gráfica (SVG a escala)
  const W = 320, H = 120, P = 24;
  const max = Math.max(4, ...serie);
  const x = (i: number) => P + (i * (W - 2 * P)) / (SEMANAS - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const linea = serie.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");

  const kpis = [
    { n: "Promedio por culto", v: String(promedio), href: "/" },
    { n: "Jóvenes activos", v: String(activos.length), href: "/jovenes" },
    { n: "Saldo", v: pesos(saldo as number), href: "/finanzas" },
    { n: "Fotos este mes", v: fotosMes === null ? "—" : String(fotosMes), href: "/evidencias" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Panel</h1>
        <p className={ui.ayuda}>Cómo va el grupo, en una pantalla.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map((k) => (
          <Link key={k.n} href={k.href} className="rounded-2xl border border-stone-200/70 bg-superficie p-4 transition hover:border-oro/60">
            <p className="text-xs text-stone-500">{k.n}</p>
            <p className="titulo mt-1 text-2xl font-semibold tabular-nums text-titulo">{k.v}</p>
          </Link>
        ))}
      </div>

      <section className={ui.card}>
        <h2 className={ui.h2}>Jóvenes que vinieron, por semana</h2>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
          aria-label={`Últimas ${SEMANAS} semanas: ${serie.join(", ")}`}>
          {[0, Math.round(max / 2), max].map((v) => (
            <g key={v}>
              <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-stone-200" strokeWidth="1" />
              <text x={P - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="currentColor" className="text-stone-400">{v}</text>
            </g>
          ))}
          <path d={`${linea} L${x(SEMANAS - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="currentColor" className="text-marca-claro" />
          <path d={linea} fill="none" stroke="currentColor" className="text-marca-medio" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {serie.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={i === SEMANAS - 1 ? 4.5 : 2.5} fill="currentColor"
              className={i === SEMANAS - 1 ? "text-oro" : "text-marca-medio"} />
          ))}
          <text x={x(SEMANAS - 1)} y={y(serie[SEMANAS - 1]) - 9} textAnchor="end" fontSize="11" fontWeight="600" fill="currentColor" className="text-titulo">
            {serie[SEMANAS - 1]} esta semana
          </text>
        </svg>
      </section>

      {perdidos.length > 0 && (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-900">Hay que buscarlos ({perdidos.length})</h2>
          <ul className="mt-2 divide-y divide-red-200">
            {perdidos.map((j) => (
              <li key={j.joven_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-red-900">{j.nombre}</span>
                <span className="text-red-700">{haceCuanto(j.ultima!, h)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(coops ?? []).length > 0 && (
        <section className={ui.card}>
          <h2 className={ui.h2}>Cooperaciones abiertas</h2>
          <ul className="mt-2 divide-y divide-stone-200/70">
            {(coops as { id: string; concepto: string; monto: number }[]).map((c) => (
              <li key={c.id}>
                <Link href={`/finanzas/cooperaciones/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="font-medium">{c.concepto}</span>
                  <span className="tabular-nums text-green-700">{pesos(juntado.get(c.id) ?? 0)} juntado</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {drive?.limite && drive.usado / drive.limite >= 0.75 && (
        <Link href="/evidencias" className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          El Drive va en {Math.round((drive.usado / drive.limite) * 100)} %. Hay que hacer limpieza de fotos.
        </Link>
      )}
    </div>
  );
}
