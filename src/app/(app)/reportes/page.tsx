import Link from "next/link";
import { Encabezado } from "@/components/Tarjeta";
import { pesos } from "@/lib/dinero";
import { driveListo, fotosDrive, repartir, type Foto } from "@/lib/drive";
import { haceCuanto, hoy, mesVecino, nombreMes, partesFecha } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, hayQueBuscar, tipo, type Actividad, type Movimiento, type ResumenJoven, SELECT_MOV } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { BotonImprimir } from "./BotonImprimir";

export const metadata = { title: "Reporte" };

type ActConConteo = Actividad & { asistencias: { count: number }[] };

/** Bloque del reporte (se ve bien en pantalla y en papel). */
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid-page space-y-3 rounded-3xl border border-stone-200/70 bg-superficie p-5 print:rounded-none print:border-0 print:border-t print:px-0">
      <h2 className="titulo text-xl font-semibold text-titulo">{titulo}</h2>
      {children}
    </section>
  );
}
function Dato({ n, v, c = "text-titulo" }: { n: string; v: string; c?: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-3 print:border print:border-stone-200 print:bg-white">
      <p className="text-xs text-stone-500">{n}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${c}`}>{v}</p>
    </div>
  );
}

export default async function Reportes({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { supabase, perfil } = await requerir((p) => enEquipo(p, "asistencia") || enEquipo(p, "finanzas"));
  const { mes: q } = await searchParams;
  const h = hoy();
  const actual = h.slice(0, 7);
  const mes = q && /^\d{4}-\d{2}$/.test(q) && q <= actual ? q : actual;
  const ini = `${mes}-01`;
  const fin = `${mesVecino(mes, 1)}-01`;
  const verAsis = enEquipo(perfil, "asistencia");
  const verDinero = enEquipo(perfil, "finanzas");

  // ---------- Asistencia ----------
  let acts: ActConConteo[] = [];
  let constantes: { nombre: string; veces: number }[] = [];
  let distintos = 0;
  let perdidos: ResumenJoven[] = [];
  if (verAsis) {
    const [{ data: a }, { data: asis }, { data: r }] = await Promise.all([
      supabase.from("actividades").select("id, titulo, tipo, fecha, hora, hora_fin, lugar, notas, horario_id, cancelada, asistencias(count)").eq("cancelada", false)
        .gte("fecha", ini).lt("fecha", fin).order("fecha").order("hora", { nullsFirst: true }),
      supabase.from("asistencias").select("joven_id, jovenes(nombre), actividades!inner(fecha)")
        .gte("actividades.fecha", ini).lt("actividades.fecha", fin),
      supabase.rpc("resumen_jovenes", { p_semanas: 8 }),
    ]);
    acts = (a ?? []) as ActConConteo[];
    const veces = new Map<string, { nombre: string; veces: number }>();
    for (const x of (asis ?? []) as unknown as { joven_id: string; jovenes: { nombre: string } | null }[]) {
      const v = veces.get(x.joven_id) ?? { nombre: x.jovenes?.nombre ?? "—", veces: 0 };
      v.veces++;
      veces.set(x.joven_id, v);
    }
    distintos = veces.size;
    constantes = [...veces.values()].sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre, "es")).slice(0, 10);
    if (mes === actual) {
      perdidos = ((r ?? []) as ResumenJoven[]).filter(hayQueBuscar);
    }
  } else {
    const { data: a } = await supabase.from("actividades").select("id, titulo, tipo, fecha, hora, hora_fin, lugar, notas, horario_id, cancelada").eq("cancelada", false).gte("fecha", ini).lt("fecha", fin).order("fecha");
    acts = ((a ?? []) as Actividad[]).map((x) => ({ ...x, asistencias: [] }));
  }
  const cultos = acts.filter((a) => a.tipo === "culto" && a.fecha <= h);
  const promedio = cultos.length ? Math.round(cultos.reduce((s, a) => s + (a.asistencias[0]?.count ?? 0), 0) / cultos.length) : 0;

  // ---------- Dinero ----------
  let movs: Movimiento[] = [];
  let saldoInicial = 0;
  let cats = new Map<string, string>();
  let coops: { id: string; concepto: string; monto: number; juntado: number }[] = [];
  if (verDinero) {
    const [{ data: m }, { data: antes }, { data: c }, { data: co }, { data: pagos }] = await Promise.all([
      supabase.from("movimientos").select(SELECT_MOV).gte("fecha", ini).lt("fecha", fin).order("fecha").order("created_at"),
      supabase.from("movimientos").select("tipo, monto").lt("fecha", ini).eq("anulado", false),
      supabase.from("categorias").select("id, nombre"),
      supabase.from("cooperaciones").select("id, concepto, monto, created_at").eq("cerrada", false),
      supabase.from("movimientos").select("cooperacion_id, monto").not("cooperacion_id", "is", null).eq("anulado", false).lt("fecha", fin),
    ]);
    movs = (m ?? []) as Movimiento[];
    saldoInicial = ((antes ?? []) as { tipo: string; monto: number }[]).reduce((s, x) => s + (x.tipo === "entrada" ? 1 : -1) * Number(x.monto), 0);
    cats = new Map((c ?? []).map((x: { id: string; nombre: string }) => [x.id, x.nombre]));
    const j = new Map<string, number>();
    for (const p of (pagos ?? []) as { cooperacion_id: string; monto: number }[]) j.set(p.cooperacion_id, (j.get(p.cooperacion_id) ?? 0) + Number(p.monto));
    coops = ((co ?? []) as { id: string; concepto: string; monto: number }[]).map((x) => ({ ...x, juntado: j.get(x.id) ?? 0 }));
  }
  const validos = movs.filter((m) => !m.anulado);
  const anulados = movs.length - validos.length;
  const entradas = validos.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.monto), 0);
  const salidas = validos.filter((m) => m.tipo === "salida").reduce((s, m) => s + Number(m.monto), 0);
  const porCat = new Map<string, { tipo: string; total: number; n: number }>();
  for (const m of validos) {
    const k = `${m.tipo}:${m.categoria}`;
    const v = porCat.get(k) ?? { tipo: m.tipo, total: 0, n: 0 };
    v.total += Number(m.monto); v.n++;
    porCat.set(k, v);
  }

  // ---------- Fotos ----------
  let fotosMes: Foto[] = [];
  let album = new Map<string, Foto[]>();
  const verFotos = enEquipo(perfil, "evidencias");
  if (driveListo() && verFotos) {
    try {
      fotosMes = (await fotosDrive()).filter((f) => f.fecha >= ini && f.fecha < fin);
      album = repartir(fotosMes, acts).album;
    } catch { /* sin Drive, sin fotos */ }
  }

  return (
    <div className="space-y-5 print:space-y-4 print:text-[12px]">
      <div className="no-print">
        <Encabezado titulo="Reportes" sub="Resumen del mes de tu equipo. Descárgalo en PDF para mandarlo, o en Excel para trabajarlo.">
          {verAsis && <a href={`/reportes/descargar?que=asistencia&mes=${mes}`} className={ui.btnSec}>Asistencia (Excel)</a>}
          {verDinero && <a href={`/reportes/descargar?que=finanzas&mes=${mes}`} className={ui.btnSec}>Movimientos (Excel)</a>}
          <BotonImprimir />
        </Encabezado>
        <div className="flex items-center gap-1">
          <Link href={`/reportes?mes=${mesVecino(mes, -1)}`} className={ui.btnMini} aria-label="Mes anterior">‹ Anterior</Link>
          <span className="min-w-40 text-center font-semibold text-titulo first-letter:uppercase">{nombreMes(mes)}</span>
          {mes < actual ? <Link href={`/reportes?mes=${mesVecino(mes, 1)}`} className={ui.btnMini}>Siguiente ›</Link> : <span className="w-20" />}
        </div>
      </div>

      {/* Portada (también sale en papel) */}
      <div className="rounded-3xl bg-gradient-to-b from-marca-medio to-marca p-6 text-white print:rounded-none print:bg-none print:p-0 print:text-black">
        <p className="text-xs uppercase tracking-[0.2em] text-oro-claro print:text-stone-500">Grupo de jóvenes · La Luz del Mundo, Colonia Sambulá</p>
        <h1 className="titulo mt-2 text-3xl font-semibold">Reporte de {nombreMes(mes)}</h1>
        <p className="mt-1 text-sm text-white/70 print:text-stone-500">Generado el {partesFecha(h).dia} {partesFecha(h).mes} por {perfil.nombre}</p>
      </div>

      {verAsis && <Seccion titulo="Actividades y asistencia">
        <div className={`grid gap-3 ${verAsis ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
          <Dato n="Actividades" v={String(acts.length)} />
          <Dato n="Cultos" v={String(acts.filter((a) => a.tipo === "culto").length)} />
          {verAsis && <Dato n="Promedio por culto" v={String(promedio)} />}
          {verAsis && <Dato n="Jóvenes distintos" v={String(distintos)} />}
        </div>
        {acts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-stone-500">
                <tr className="border-b border-stone-200"><th className="py-2 pr-3">Fecha</th><th className="py-2 pr-3">Actividad</th><th className="py-2 pr-3">Tipo</th>
                  {verAsis && <th className="py-2 text-right">Vinieron</th>}{verFotos && <th className="py-2 pl-3 text-right">Fotos</th>}</tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70">
                {acts.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{partesFecha(a.fecha).semana} {partesFecha(a.fecha).dia}</td>
                    <td className="py-2 pr-3 font-medium">{a.titulo}</td>
                    <td className="py-2 pr-3 text-stone-500">{tipo(a.tipo).n}</td>
                    {verAsis && <td className="py-2 text-right tabular-nums">{a.fecha <= h ? a.asistencias[0]?.count ?? 0 : "—"}</td>}
                    {verFotos && <td className="py-2 pl-3 text-right tabular-nums text-stone-500">{album.get(a.id)?.length ?? 0}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {verAsis && (constantes.length > 0 || perdidos.length > 0) && (
          <div className="grid gap-5 pt-2 sm:grid-cols-2">
            {constantes.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-semibold text-titulo">Los más constantes</h3>
                <ol className="space-y-0.5 text-sm">
                  {constantes.map((c, i) => (
                    <li key={c.nombre} className="flex justify-between gap-3"><span>{i + 1}. {c.nombre}</span><span className="tabular-nums text-stone-500">{c.veces}</span></li>
                  ))}
                </ol>
              </div>
            )}
            {perdidos.length > 0 && (
              <div>
                <h3 className="mb-1 text-sm font-semibold text-red-800">Hay que buscarlos ({perdidos.length})</h3>
                <ul className="space-y-0.5 text-sm">
                  {perdidos.map((p) => (
                    <li key={p.joven_id} className="flex justify-between gap-3"><span>{p.nombre}</span><span className="text-stone-500">{haceCuanto(p.ultima!, h)}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Seccion>}

      {verDinero && (
        <Seccion titulo="Dinero">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Dato n="Saldo al iniciar" v={pesos(saldoInicial)} />
            <Dato n="Entró" v={`+${pesos(entradas)}`} c="text-green-700" />
            <Dato n="Salió" v={`−${pesos(salidas)}`} />
            <Dato n="Saldo al cerrar" v={pesos(saldoInicial + entradas - salidas)} />
          </div>
          {porCat.size > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-stone-500">
                <tr className="border-b border-stone-200"><th className="py-2">Categoría</th><th className="py-2 text-right">Movimientos</th><th className="py-2 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70">
                {[...porCat.entries()].sort((a, b) => a[1].tipo.localeCompare(b[1].tipo) || b[1].total - a[1].total).map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1.5">{cats.get(k.split(":")[1]) ?? k.split(":")[1]} <span className="text-xs text-stone-400">({v.tipo})</span></td>
                    <td className="py-1.5 text-right tabular-nums text-stone-500">{v.n}</td>
                    <td className={`py-1.5 text-right tabular-nums ${v.tipo === "entrada" ? "text-green-700" : ""}`}>{v.tipo === "entrada" ? "+" : "−"}{pesos(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {validos.length > 0 && (
            <details className="group print:block" open>
              <summary className="cursor-pointer text-sm font-semibold text-titulo print:hidden">Detalle de movimientos ({validos.length})</summary>
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y divide-stone-200/70">
                  {validos.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums text-stone-500">{partesFecha(m.fecha).dia} {partesFecha(m.fecha).mes}</td>
                      <td className="py-1.5 pr-3">{m.concepto}{m.comprobante && <span className="ml-1 text-xs text-oro">· ticket</span>}</td>
                      <td className={`whitespace-nowrap py-1.5 text-right tabular-nums ${m.tipo === "entrada" ? "text-green-700" : ""}`}>{m.tipo === "entrada" ? "+" : "−"}{pesos(m.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
          {anulados > 0 && <p className="text-xs text-stone-500">{anulados} {anulados === 1 ? "movimiento anulado" : "movimientos anulados"} este mes (no cuentan en los totales).</p>}
          {coops.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-titulo">Cooperaciones abiertas</h3>
              <ul className="space-y-0.5 text-sm">
                {coops.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3"><span>{c.concepto} <span className="text-stone-400">({pesos(c.monto)} c/u)</span></span><span className="tabular-nums text-green-700">{pesos(c.juntado)} juntado</span></li>
                ))}
              </ul>
            </div>
          )}
        </Seccion>
      )}

      {driveListo() && verFotos && (
        <Seccion titulo="Evidencias">
          <p className="text-sm">
            <b className="tabular-nums">{fotosMes.length}</b> fotos este mes
            {acts.length > 0 && <>, en <b className="tabular-nums">{[...album.keys()].length}</b> de {acts.length} actividades.</>}
          </p>
        </Seccion>
      )}
    </div>
  );
}
