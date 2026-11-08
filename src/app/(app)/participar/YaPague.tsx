import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { pesos } from "@/lib/dinero";
import { ui } from "@/lib/ui";
import { avisarPago } from "./actions";

export type MiAviso = { cooperacion_id: string; monto: number; estado: "pendiente" | "confirmado" | "rechazado"; motivo: string | null; created_at: string };

/** Debajo de cada cooperación que debe: "Ya pagué" (o en qué va su aviso). */
export function YaPague({ cooperacion, falta, aviso, finanzas }: {
  cooperacion: string; falta: number; aviso?: MiAviso; finanzas: { id: string; nombre: string }[];
}) {
  if (aviso?.estado === "pendiente") {
    return <p className="mt-1 text-xs text-amber-800">Avisaste que diste {pesos(Number(aviso.monto))}. Falta que finanzas lo confirme.</p>;
  }
  return (
    <>
      {aviso?.estado === "rechazado" && (
        <p className="mt-1 text-xs text-red-700">Finanzas no confirmó tu aviso: {aviso.motivo}</p>
      )}
      <details className="group mt-1">
        <summary className="cursor-pointer list-none text-xs font-semibold text-oro hover:text-titulo">Ya pagué →</summary>
        <Formulario action={avisarPago} className="mt-2 space-y-2 rounded-xl bg-superficie p-3">
          <input type="hidden" name="cooperacion_id" value={cooperacion} />
          <div className="grid grid-cols-2 gap-2">
            <label className={ui.label}>¿Cuánto?
              <input name="monto" inputMode="decimal" defaultValue={falta.toFixed(2)} className={`${ui.input} h-10 tabular-nums`} />
            </label>
            <label className={ui.label}>¿A quién?
              <select name="recibio" required defaultValue="" className={`${ui.input} h-10`}>
                <option value="" disabled>Elige</option>
                {finanzas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </label>
          </div>
          <input name="nota" placeholder="Nota (opcional): ej. en el culto del domingo" className={`${ui.input} mt-0 h-10`} />
          <div className="flex justify-end"><Submit variante="btnSec">Avisar</Submit></div>
        </Formulario>
      </details>
    </>
  );
}
