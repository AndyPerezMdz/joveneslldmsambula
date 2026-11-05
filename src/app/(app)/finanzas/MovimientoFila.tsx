import { Formulario } from "@/components/Formulario";
import { IcTicket } from "@/components/Iconos";
import { Submit } from "@/components/Submit";
import { pesos } from "@/lib/dinero";
import { partesFecha } from "@/lib/fechas";
import type { Movimiento } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { anularMovimiento } from "./actions";

/** Encabezado de columnas (solo en pantallas anchas). */
export function EncabezadoMovimientos() {
  return (
    <div className="hidden grid-cols-[3.5rem_1fr_9rem_7.5rem_2rem] gap-3 border-b border-stone-200/70 bg-stone-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500 md:grid">
      <span>Fecha</span><span>Concepto</span><span>Categoría</span><span className="text-right">Monto</span><span />
    </div>
  );
}

/** Un renglón de la tabla de movimientos. Con `puedeAnular`, se despliega para anularlo. */
export function MovimientoFila({ m, categoria, detalle, puedeAnular }: {
  m: Movimiento; categoria: string; detalle?: string; puedeAnular: boolean;
}) {
  const f = partesFecha(m.fecha);
  const entrada = m.tipo === "entrada";
  const tachado = m.anulado ? "text-stone-400 line-through" : "";

  const fila = (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[3.5rem_1fr_9rem_7.5rem_2rem]">
      <span className="leading-tight text-stone-500">
        <span className="block text-base font-semibold tabular-nums text-titulo">{f.dia}</span>
        <span className="text-[11px] uppercase">{f.mes}</span>
      </span>
      <span className="min-w-0">
        <span className={`block truncate font-medium ${tachado}`}>{m.concepto}</span>
        <span className="block truncate text-xs text-stone-500">
          {m.anulado ? `Anulado · ${m.anulado_motivo}` : <><span className="md:hidden">{categoria}{detalle ? " · " : ""}</span>{detalle}</>}
        </span>
      </span>
      <span className="hidden md:block">
        <span className="inline-block max-w-full truncate rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">{categoria}</span>
      </span>
      <span className={`text-right font-semibold tabular-nums ${m.anulado ? "text-stone-400 line-through" : entrada ? "text-green-700" : "text-tinta"}`}>
        {entrada ? "+" : "−"}{pesos(m.monto)}
      </span>
      <span className="hidden justify-end md:flex">
        {m.comprobante && <IcTicket className="size-4 text-oro" />}
      </span>
    </div>
  );

  return (
    <li>
      <details className="group">
        <summary className="cursor-pointer list-none transition hover:bg-stone-50">{fila}</summary>
        <div className="flex flex-wrap items-end gap-3 border-t border-dashed border-stone-200 bg-stone-50/60 px-4 py-3">
          {m.comprobante && (
            <a href={`/api/foto/${m.comprobante}?t=full`} target="_blank" rel="noreferrer" className={ui.btnSec}>
              <IcTicket /> Ver ticket
            </a>
          )}
          {puedeAnular && !m.anulado && (
            <Formulario action={anularMovimiento} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={m.id} />
              <label className={`${ui.label} min-w-48 flex-1`}>
                Anular: ¿por qué?
                <input name="motivo" required minLength={3} placeholder="Registrado dos veces, monto equivocado…" className={`${ui.input} h-10`} />
              </label>
              <Submit variante="btnPeligro" confirmar="¿Anular este movimiento? Queda en el historial tachado y ya no cuenta en el saldo.">
                Anular
              </Submit>
            </Formulario>
          )}
          {m.anulado && <p className="text-sm text-stone-500">Anulado: {m.anulado_motivo}</p>}
          {!m.comprobante && !puedeAnular && !m.anulado && <p className="text-sm text-stone-500">Sin ticket.</p>}
        </div>
      </details>
    </li>
  );
}
