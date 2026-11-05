import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { pesos } from "@/lib/dinero";
import { fechaLarga } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, SELECT_MOV, type Cooperacion, type Movimiento } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { cambiarExclusion, cerrarCooperacion, registrarPago } from "../../actions";
import { MovimientoFila } from "../../MovimientoFila";

export const metadata = { title: "Cooperación" };

type Estado = { joven_id: string; nombre: string; aportado: number; excluido: boolean };

export default async function DetalleCooperacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requerir((p) => enEquipo(p, "finanzas"));

  const [{ data: c }, { data: e }, { data: m }] = await Promise.all([
    supabase.from("cooperaciones").select("id, concepto, monto, fecha_limite, actividad_id, cerrada").eq("id", id).maybeSingle<Cooperacion>(),
    supabase.rpc("estado_cooperacion", { p_id: id }),
    supabase.from("movimientos").select(SELECT_MOV).eq("cooperacion_id", id).order("created_at", { ascending: false }),
  ]);
  if (!c) notFound();

  const monto = Number(c.monto);
  const filas = ((e ?? []) as Estado[]).map((x) => ({ ...x, aportado: Number(x.aportado) }));
  const lesToca = filas.filter((x) => !x.excluido);
  const esperado = lesToca.length * monto;
  const juntado = filas.reduce((s, x) => s + x.aportado, 0);
  const estado = (x: Estado) => (x.excluido ? 3 : x.aportado >= monto ? 2 : x.aportado > 0 ? 1 : 0);
  const orden = [...filas].sort((a, b) => estado(a) - estado(b) || a.nombre.localeCompare(b.nombre, "es"));
  const pagaron = lesToca.filter((x) => x.aportado >= monto).length;
  const nombres = new Map(filas.map((x) => [x.joven_id, x.nombre]));
  const pct = esperado ? Math.min(100, (juntado / esperado) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href="/finanzas/cooperaciones" className="text-sm text-stone-500 hover:text-titulo">← Cooperaciones</Link>
      <div>
        <h1 className={ui.h1}>{c.concepto}</h1>
        <p className={ui.ayuda}>
          {pesos(monto)} por persona{c.fecha_limite && ` · hasta el ${fechaLarga(c.fecha_limite)}`}{c.cerrada && " · cerrada"}
        </p>
      </div>

      <div className={`${ui.card} space-y-3`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-stone-500">Juntado</p>
            <p className="titulo text-3xl font-semibold tabular-nums text-titulo">{pesos(juntado)}</p>
          </div>
          <p className="text-right text-sm text-stone-500">de {pesos(esperado)}<br />{pagaron} de {lesToca.length} completos</p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-gradient-to-r from-oro to-oro-vivo" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {orden.map((x) => {
          const falta = Math.max(0, monto - x.aportado);
          const s = estado(x);
          return (
            <li key={x.joven_id} className={`rounded-2xl border bg-superficie p-3 ${x.excluido ? "border-dashed border-stone-300 opacity-60" : "border-stone-200/70"}`}>
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{x.nombre}</span>
                  <span className={`text-xs font-medium ${["text-red-600", "text-amber-700", "text-green-700", "text-stone-400"][s]}`}>
                    {["No ha dado", `Dio ${pesos(x.aportado)} · faltan ${pesos(falta)}`, x.aportado > monto ? `Completo (dio ${pesos(x.aportado)})` : "Completo", "No aplica"][s]}
                  </span>
                </span>
                {!c.cerrada && (
                  <Formulario action={cambiarExclusion} silencioso>
                    <input type="hidden" name="cooperacion_id" value={c.id} />
                    <input type="hidden" name="joven_id" value={x.joven_id} />
                    <input type="hidden" name="excluir" value={x.excluido ? "false" : "true"} />
                    <Submit variante="btnMini">{x.excluido ? "Sí aplica" : "No aplica"}</Submit>
                  </Formulario>
                )}
              </div>
              {!c.cerrada && !x.excluido && falta > 0 && (
                <Formulario action={registrarPago} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="cooperacion_id" value={c.id} />
                  <input type="hidden" name="joven_id" value={x.joven_id} />
                  <input type="hidden" name="concepto" value={`${c.concepto} · ${x.nombre}`} />
                  {c.actividad_id && <input type="hidden" name="actividad_id" value={c.actividad_id} />}
                  <input name="monto" inputMode="decimal" defaultValue={falta.toFixed(2)} aria-label={`Monto que dio ${x.nombre}`}
                    className={`${ui.input} mt-0 h-10 w-32 tabular-nums`} />
                  <Submit variante="btnSec">Registrar pago</Submit>
                </Formulario>
              )}
            </li>
          );
        })}
      </ul>

      {(m ?? []).length > 0 && (
        <section className={ui.card}>
          <h2 className={ui.h2}>Pagos registrados</h2>
          <ul className="mt-2 divide-y divide-stone-200/70">
            {((m ?? []) as Movimiento[]).map((x) => (
              <MovimientoFila key={x.id} m={x} puedeAnular detalle={x.joven_id ? nombres.get(x.joven_id) : undefined} />
            ))}
          </ul>
        </section>
      )}

      <Formulario action={cerrarCooperacion} className="flex justify-end">
        <input type="hidden" name="id" value={c.id} />
        <input type="hidden" name="cerrada" value={c.cerrada ? "false" : "true"} />
        {c.cerrada
          ? <Submit variante="btnSec">Reabrir cooperación</Submit>
          : <Submit variante="btnSec" confirmar="¿Cerrar esta cooperación? Ya no se le pedirá a nadie. Se puede reabrir después.">Cerrar cooperación</Submit>}
      </Formulario>
    </div>
  );
}
