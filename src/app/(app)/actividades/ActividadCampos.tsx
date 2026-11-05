import { ui } from "@/lib/ui";
import { TIPOS, type Actividad } from "@/lib/tipos";

/** Campos compartidos entre "nueva" y "editar". */
export function ActividadCampos({ a, fecha }: { a?: Actividad; fecha?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${ui.label} sm:col-span-2`}>
        Nombre
        <input name="titulo" required defaultValue={a?.titulo} placeholder="Culto juvenil, Venta de tamales…" className={ui.input} />
      </label>
      <label className={ui.label}>
        Tipo
        <select name="tipo" defaultValue={a?.tipo ?? "culto"} className={ui.input}>
          {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}
        </select>
      </label>
      <label className={ui.label}>
        Lugar <span className="font-normal text-stone-400">(opcional)</span>
        <input name="lugar" defaultValue={a?.lugar ?? ""} placeholder="Templo, casa de…" className={ui.input} />
      </label>
      <label className={ui.label}>
        Fecha
        <input name="fecha" type="date" required defaultValue={a?.fecha ?? fecha} className={ui.input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={ui.label}>
          Empieza <span className="font-normal text-stone-400">(opc.)</span>
          <input name="hora" type="time" defaultValue={a?.hora?.slice(0, 5) ?? ""} className={ui.input} />
        </label>
        <label className={ui.label}>
          Termina <span className="font-normal text-stone-400">(opc.)</span>
          <input name="hora_fin" type="time" defaultValue={a?.hora_fin?.slice(0, 5) ?? ""} className={ui.input} />
        </label>
      </div>
      <label className={`${ui.label} sm:col-span-2`}>
        Notas <span className="font-normal text-stone-400">(opcional)</span>
        <textarea name="notas" rows={2} defaultValue={a?.notas ?? ""} className={ui.input} />
      </label>
    </div>
  );
}
