import Link from "next/link";
import { pesos } from "@/lib/dinero";
import { hoy } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { categoria, enEquipo, SELECT_MOV, type CategoriaMov, type Movimiento } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { MovimientoFila } from "./MovimientoFila";

export const metadata = { title: "Finanzas" };

function mesVecino(mes: string, n: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
const nombreMes = (mes: string) =>
  new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("es-MX", { timeZone: "UTC", month: "long", year: "numeric" });

export default async function Finanzas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { supabase } = await requerir((p) => enEquipo(p, "finanzas"));
  const { mes: q } = await searchParams;
  const actual = hoy().slice(0, 7);
  const mes = q && /^\d{4}-\d{2}$/.test(q) ? q : actual;

  const [{ data: saldo }, { data: movs }, { data: acts }, { data: coops }] = await Promise.all([
    supabase.rpc("saldo"),
    supabase.from("movimientos").select(SELECT_MOV)
      .gte("fecha", `${mes}-01`).lt("fecha", `${mesVecino(mes, 1)}-01`)
      .order("fecha", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("actividades").select("id, titulo"),
    supabase.from("cooperaciones").select("id").eq("cerrada", false),
  ]);
  const lista = (movs ?? []) as Movimiento[];
  const titulos = new Map((acts ?? []).map((a: { id: string; titulo: string }) => [a.id, a.titulo]));
  const validos = lista.filter((m) => !m.anulado);
  const entradas = validos.filter((m) => m.tipo === "entrada").reduce((s, m) => s + Number(m.monto), 0);
  const salidas = validos.filter((m) => m.tipo === "salida").reduce((s, m) => s + Number(m.monto), 0);

  // Por categoría (para el reporte del mes)
  const porCat = new Map<string, { tipo: string; total: number }>();
  for (const m of validos) {
    const k = `${m.tipo}:${m.categoria}`;
    porCat.set(k, { tipo: m.tipo, total: (porCat.get(k)?.total ?? 0) + Number(m.monto) });
  }
  const cats = [...porCat.entries()].sort((a, b) => b[1].total - a[1].total);
  const maximo = Math.max(1, ...cats.map(([, v]) => v.total));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className={ui.h1}>Finanzas</h1>
        <div className="flex gap-2">
          <Link href="/finanzas/cooperaciones" className={ui.btnSec}>
            Cooperaciones{coops?.length ? <span className="rounded-full bg-oro-suave px-2 text-xs font-bold text-titulo">{coops.length}</span> : null}
          </Link>
          <Link href="/finanzas/nuevo" className={ui.btnOro}>+ Registrar</Link>
        </div>
      </div>

      {/* Saldo */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-marca-medio to-marca p-6 text-white shadow-lg shadow-marca/25">
        <div className="rayos absolute inset-0 opacity-60" />
        <p className="relative text-sm text-white/70">Saldo actual</p>
        <p className="titulo relative mt-1 text-4xl font-semibold tabular-nums">{pesos(saldo as number)}</p>
      </div>

      {/* Mes */}
      <div className="flex items-center justify-between gap-2">
        <Link href={`/finanzas?mes=${mesVecino(mes, -1)}`} className={ui.btnMini} aria-label="Mes anterior">‹ Anterior</Link>
        <h2 className="text-base font-semibold capitalize text-titulo">{nombreMes(mes)}</h2>
        {mes < actual
          ? <Link href={`/finanzas?mes=${mesVecino(mes, 1)}`} className={ui.btnMini} aria-label="Mes siguiente">Siguiente ›</Link>
          : <span className="w-20" />}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { n: "Entró", v: entradas, c: "text-green-700" },
          { n: "Salió", v: salidas, c: "text-red-700" },
          { n: "Quedó", v: entradas - salidas, c: "text-titulo" },
        ].map((k) => (
          <div key={k.n} className="rounded-2xl border border-stone-200/70 bg-superficie p-3">
            <p className="text-xs text-stone-500">{k.n}</p>
            <p className={`mt-0.5 font-semibold tabular-nums ${k.c}`}>{pesos(k.v)}</p>
          </div>
        ))}
      </div>

      {cats.length > 0 && (
        <section className={`${ui.card} space-y-3`}>
          <h3 className={ui.h2}>En qué se movió el dinero</h3>
          <ul className="space-y-2.5">
            {cats.map(([k, v]) => (
              <li key={k} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate">{categoria(k.split(":")[1] as CategoriaMov)}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                  <span className={`block h-full rounded-full ${v.tipo === "entrada" ? "bg-green-700/70" : "bg-red-600/70"}`}
                    style={{ width: `${(v.total / maximo) * 100}%` }} />
                </span>
                <span className={`tabular-nums ${v.tipo === "entrada" ? "text-green-700" : "text-red-700"}`}>
                  {v.tipo === "entrada" ? "+" : "−"}{pesos(v.total)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={ui.card}>
        <h3 className={ui.h2}>Movimientos</h3>
        {lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">No hubo movimientos este mes.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-200/70">
            {lista.map((m) => (
              <MovimientoFila key={m.id} m={m} puedeAnular detalle={m.actividad_id ? titulos.get(m.actividad_id) : undefined} />
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-stone-500">Toca un movimiento para anularlo. Nada se borra: lo anulado queda tachado.</p>
      </section>
    </div>
  );
}
