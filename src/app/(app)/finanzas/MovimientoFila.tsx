import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { pesos } from "@/lib/dinero";
import { partesFecha } from "@/lib/fechas";
import { categoria, type Movimiento } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { anularMovimiento } from "./actions";

/** Un movimiento. Con `puedeAnular`, se despliega para anularlo con motivo. */
export function MovimientoFila({ m, detalle, puedeAnular }: { m: Movimiento; detalle?: string; puedeAnular: boolean }) {
  const f = partesFecha(m.fecha);
  const entrada = m.tipo === "entrada";
  const cuerpo = (
    <>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
        m.anulado ? "bg-stone-100 text-stone-400" : entrada ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}>
        {entrada ? "+" : "−"}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-medium ${m.anulado ? "text-stone-400 line-through" : ""}`}>{m.concepto}</span>
        <span className="block truncate text-xs text-stone-500">
          {m.anulado ? `Anulado: ${m.anulado_motivo}` : `${categoria(m.categoria)} · ${f.dia} ${f.mes}${detalle ? ` · ${detalle}` : ""}`}
        </span>
      </span>
      {m.comprobante && (
        <a href={`/api/foto/${m.comprobante}?t=full`} target="_blank" rel="noreferrer"
          className="shrink-0 rounded-lg bg-oro-suave px-2 py-1 text-[11px] font-semibold text-titulo hover:bg-oro-claro"
          title="Ver ticket">Ticket</a>
      )}
      <span className={`shrink-0 font-semibold tabular-nums ${m.anulado ? "text-stone-400 line-through" : entrada ? "text-green-700" : "text-red-700"}`}>
        {entrada ? "+" : "−"}{pesos(m.monto)}
      </span>
    </>
  );

  if (!puedeAnular || m.anulado) {
    return <li className="flex items-center gap-3 py-2.5">{cuerpo}</li>;
  }
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 py-2.5">{cuerpo}</summary>
        <Formulario action={anularMovimiento} className="mb-3 flex flex-wrap items-end gap-2 rounded-2xl bg-stone-50 p-3">
          <input type="hidden" name="id" value={m.id} />
          <label className={`${ui.label} min-w-0 flex-1`}>
            ¿Por qué se anula?
            <input name="motivo" required minLength={3} placeholder="Registrado dos veces, monto equivocado…" className={ui.input} />
          </label>
          <Submit variante="btnPeligro" confirmar="¿Anular este movimiento? Queda en el historial tachado y ya no cuenta en el saldo.">
            Anular
          </Submit>
        </Formulario>
      </details>
    </li>
  );
}
