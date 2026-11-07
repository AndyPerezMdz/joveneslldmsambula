import Link from "next/link";
import { IcTicket } from "@/components/Iconos";
import { Encabezado, Tarjeta } from "@/components/Tarjeta";
import { pesos } from "@/lib/dinero";
import { hoy, mesVecino, nombreMes } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, SELECT_MOV, type Movimiento } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { EncabezadoMovimientos, MovimientoFila } from "./MovimientoFila";

export const metadata = { title: "Finanzas" };

export default async function Finanzas({ searchParams }: { searchParams: Promise<{ mes?: string; tipo?: string }> }) {
  const { supabase } = await requerir((p) => enEquipo(p, "finanzas"));
  const { mes: q, tipo } = await searchParams;
  const actual = hoy().slice(0, 7);
  const mes = q && /^\d{4}-\d{2}$/.test(q) ? q : actual;
  const filtro = tipo === "entrada" || tipo === "salida" ? tipo : null;

  const [{ data: saldo }, { data: movs }, { data: acts }, { data: cats }, { data: coops }, { data: pagos }] = await Promise.all([
    supabase.rpc("saldo"),
    supabase.from("movimientos").select(SELECT_MOV)
      .gte("fecha", `${mes}-01`).lt("fecha", `${mesVecino(mes, 1)}-01`)
      .order("fecha", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("actividades").select("id, titulo"),
    supabase.from("categorias").select("id, nombre"),
    supabase.from("cooperaciones").select("id, concepto, monto").eq("cerrada", false),
    supabase.from("movimientos").select("cooperacion_id, monto").not("cooperacion_id", "is", null).eq("anulado", false),
  ]);
  const lista = (movs ?? []) as Movimiento[];
  const titulos = new Map((acts ?? []).map((a: { id: string; titulo: string }) => [a.id, a.titulo]));
  const nombres = new Map((cats ?? []).map((c: { id: string; nombre: string }) => [c.id, c.nombre]));
  const validos = lista.filter((m) => !m.anulado);
  const suma = (t: string) => validos.filter((m) => m.tipo === t).reduce((s, m) => s + Number(m.monto), 0);
  const entradas = suma("entrada");
  const salidas = suma("salida");
  const visibles = filtro ? lista.filter((m) => m.tipo === filtro) : lista;
  const sinTicket = validos.filter((m) => m.tipo === "salida" && !m.comprobante).length;

  // Por categoría
  const porCat = new Map<string, { tipo: string; total: number }>();
  for (const m of validos) {
    const k = `${m.tipo}:${m.categoria}`;
    porCat.set(k, { tipo: m.tipo, total: (porCat.get(k)?.total ?? 0) + Number(m.monto) });
  }
  const catsMes = [...porCat.entries()].sort((a, b) => b[1].total - a[1].total);
  const maximo = Math.max(1, ...catsMes.map(([, v]) => v.total));

  const juntado = new Map<string, number>();
  for (const p of (pagos ?? []) as { cooperacion_id: string; monto: number }[]) juntado.set(p.cooperacion_id, (juntado.get(p.cooperacion_id) ?? 0) + Number(p.monto));

  const url = (o: { mes?: string; tipo?: string | null }) => {
    const p = new URLSearchParams();
    const m = o.mes ?? mes;
    if (m !== actual) p.set("mes", m);
    const t = o.tipo === undefined ? filtro : o.tipo;
    if (t) p.set("tipo", t);
    return `/finanzas${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <Encabezado titulo="Finanzas" sub="Nada se borra: lo anulado queda tachado en el historial.">
        <Link href="/finanzas/categorias" className={ui.btnSec}>Categorías</Link>
        <Link href="/finanzas/cooperaciones" className={ui.btnSec}>Cooperaciones</Link>
        <Link href="/finanzas/nuevo" className={ui.btnOro}>+ Registrar</Link>
      </Encabezado>

      {/* Fila de indicadores */}
      <div className="escalonado mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-marca-medio to-marca p-4 text-white shadow-lg shadow-marca/20 col-span-2 lg:col-span-1">
          <div className="rayos absolute inset-0 opacity-50" />
          <p className="relative text-xs font-medium text-white/70">Saldo actual</p>
          <p className="titulo relative mt-1 text-3xl font-semibold tabular-nums">{pesos(saldo as number)}</p>
        </div>
        {[
          { n: "Entró este mes", v: entradas, c: "text-green-700", t: "entrada" },
          { n: "Salió este mes", v: salidas, c: "text-tinta", t: "salida" },
          { n: "Resultado del mes", v: entradas - salidas, c: entradas - salidas >= 0 ? "text-green-700" : "text-red-700", t: null, ancho: true },
        ].map((k) => (
          <Link key={k.n} href={url({ tipo: k.t })}
            className={`rounded-2xl border bg-superficie p-4 transition hover:border-oro/60 ${"ancho" in k ? "col-span-2 lg:col-span-1" : ""} ${filtro && filtro === k.t ? "border-oro ring-2 ring-oro/20" : "border-stone-200/70"}`}>
            <p className="text-xs font-medium text-stone-500">{k.n}</p>
            <p className={`titulo mt-1 text-2xl font-semibold tabular-nums ${k.c}`}>{k.v < 0 ? "−" : ""}{pesos(Math.abs(k.v))}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Movimientos */}
        <section className="overflow-hidden rounded-3xl border border-stone-200/70 bg-superficie lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-1">
              <Link href={url({ mes: mesVecino(mes, -1) })} className={ui.btnMini} aria-label="Mes anterior">‹</Link>
              <h2 className="min-w-36 text-center text-[15px] font-semibold text-titulo first-letter:uppercase">{nombreMes(mes)}</h2>
              {mes < actual
                ? <Link href={url({ mes: mesVecino(mes, 1) })} className={ui.btnMini} aria-label="Mes siguiente">›</Link>
                : <span className="w-8" />}
            </div>
            <div className="inline-flex rounded-xl border border-stone-200 p-0.5 text-xs">
              {[{ t: null, n: "Todo" }, { t: "entrada", n: "Entradas" }, { t: "salida", n: "Salidas" }].map((x) => (
                <Link key={x.n} href={url({ tipo: x.t })}
                  className={`rounded-lg px-3 py-1 font-medium ${filtro === x.t ? "bg-marca text-white" : "text-stone-500 hover:text-titulo"}`}>{x.n}</Link>
              ))}
            </div>
          </div>
          <EncabezadoMovimientos />
          {visibles.length === 0 ? (
            <p className="border-t border-stone-200/70 p-10 text-center text-sm text-stone-500">Sin movimientos en {nombreMes(mes)}.</p>
          ) : (
            <ul className="divide-y divide-stone-200/70 border-t border-stone-200/70 md:border-t-0">
              {visibles.map((m) => (
                <MovimientoFila key={m.id} m={m} puedeAnular categoria={nombres.get(m.categoria) ?? m.categoria}
                  detalle={m.actividad_id ? titulos.get(m.actividad_id) : undefined} />
              ))}
            </ul>
          )}
        </section>

        {/* Lado derecho */}
        <div className="space-y-5">
          <Tarjeta titulo="Por categoría" accion="Reporte" href={`/reportes?mes=${mes}`}>
            {catsMes.length === 0 ? (
              <p className="text-sm text-stone-500">Nada este mes.</p>
            ) : (
              <ul className="space-y-3">
                {catsMes.map(([k, v]) => (
                  <li key={k} className="text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate">{nombres.get(k.split(":")[1]) ?? k.split(":")[1]}</span>
                      <span className={`shrink-0 tabular-nums ${v.tipo === "entrada" ? "text-green-700" : "text-tinta"}`}>
                        {v.tipo === "entrada" ? "+" : "−"}{pesos(v.total)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div className={`h-full rounded-full ${v.tipo === "entrada" ? "bg-green-700/70" : "bg-marca-medio/70"}`} style={{ width: `${(v.total / maximo) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          {sinTicket > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <IcTicket className="mt-0.5 size-4 shrink-0" />
              <span>{sinTicket} {sinTicket === 1 ? "gasto" : "gastos"} de este mes sin foto del ticket.</span>
            </div>
          )}

          <Tarjeta titulo="Cooperaciones abiertas" accion="Ver todas" href="/finanzas/cooperaciones">
            {(coops ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">No hay cooperaciones abiertas.</p>
            ) : (
              <ul className="divide-y divide-stone-200/70">
                {(coops as { id: string; concepto: string; monto: number }[]).map((c) => (
                  <li key={c.id}>
                    <Link href={`/finanzas/cooperaciones/${c.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-titulo">
                      <span className="truncate">{c.concepto}</span>
                      <span className="shrink-0 tabular-nums text-green-700">{pesos(juntado.get(c.id) ?? 0)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
