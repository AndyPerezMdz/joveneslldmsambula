import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { Tarjeta } from "@/components/Tarjeta";
import { pesos } from "@/lib/dinero";
import type { createClient } from "@/lib/supabase/server";
import { ui } from "@/lib/ui";
import { revisarAviso } from "./actions";

type Cliente = Awaited<ReturnType<typeof createClient>>;
export type AvisoPendiente = {
  id: string; monto: number; nota: string | null; created_at: string; cooperacion_id: string;
  jovenes: { nombre: string } | null; cooperaciones: { concepto: string } | null; recibio_perfil: { nombre: string } | null;
};

export async function cargarAvisos(supabase: Cliente, cooperacion?: string): Promise<AvisoPendiente[]> {
  let q = supabase.from("avisos_pago")
    .select("id, monto, nota, created_at, cooperacion_id, jovenes(nombre), cooperaciones(concepto), recibio_perfil:perfiles!avisos_pago_recibio_fkey(nombre)")
    .eq("estado", "pendiente").order("created_at");
  if (cooperacion) q = q.eq("cooperacion_id", cooperacion);
  const { data } = await q;
  return (data ?? []) as unknown as AvisoPendiente[];
}

/** Finanzas: "Fulano dice que le dio $100 a Mengano" → confirmar o rechazar. */
export function AvisosPorConfirmar({ avisos, conCooperacion = true }: { avisos: AvisoPendiente[]; conCooperacion?: boolean }) {
  if (!avisos.length) return null;
  return (
    <Tarjeta titulo={`Pagos por confirmar (${avisos.length})`} tono="oro">
      <p className="-mt-2 mb-3 text-xs text-titulo/70">Dicen que ya pagaron. Si sí te llegó el dinero, confírmalo y se registra solo.</p>
      <ul className="space-y-2">
        {avisos.map((x) => (
          <li key={x.id} className="rounded-2xl bg-superficie p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-medium">{x.jovenes?.nombre ?? "—"}</span>
                <span className="text-xs text-stone-500">
                  {conCooperacion && `${x.cooperaciones?.concepto ?? ""} · `}Le dio a {x.recibio_perfil?.nombre ?? "—"}
                </span>
                {x.nota && <span className="block text-xs italic text-stone-500">“{x.nota}”</span>}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-titulo">{pesos(Number(x.monto))}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <details className="group">
                <summary className={`${ui.btnMini} cursor-pointer list-none`}>No me llegó</summary>
                <Formulario action={revisarAviso} className="mt-2 flex items-end gap-2">
                  <input type="hidden" name="id" value={x.id} />
                  <input type="hidden" name="confirmar" value="false" />
                  <input name="motivo" required minLength={3} placeholder="¿Por qué?" className={`${ui.input} mt-0 h-9 text-sm`} />
                  <Submit variante="btnPeligro">Rechazar</Submit>
                </Formulario>
              </details>
              <Formulario action={revisarAviso}>
                <input type="hidden" name="id" value={x.id} />
                <input type="hidden" name="confirmar" value="true" />
                <Submit variante="btn">Confirmar</Submit>
              </Formulario>
            </div>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
