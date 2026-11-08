import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { Encabezado } from "@/components/Tarjeta";
import { fechaLarga } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { esAdmin, SELECT_ACT, type Actividad } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { ActividadCampos } from "../../ActividadCampos";
import { actualizarActividad } from "../../actions";

export const metadata = { title: "Revisar actividades" };

/** Después de importar: cada actividad con sus campos, para afinar horas, lugar y notas. */
export default async function Revisar({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { supabase } = await requerir(esAdmin);
  const ids = ((await searchParams).ids ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 60);
  const { data } = ids.length
    ? await supabase.from("actividades").select(SELECT_ACT).in("id", ids).order("fecha").order("hora", { nullsFirst: true })
    : { data: [] };
  const acts = (data ?? []) as Actividad[];
  const sinHora = acts.filter((a) => !a.hora).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/actividades?ver=proximas" className="text-sm text-stone-500 hover:text-titulo">← Actividades</Link>
      <Encabezado titulo="Revisa los detalles"
        sub={`Se crearon ${acts.length}. ${sinHora ? `${sinHora} no ${sinHora === 1 ? "tiene" : "tienen"} hora: ponla para que las fotos se acomoden solas.` : "Todas tienen hora."}`} />
      {acts.map((a) => (
        <details key={a.id} className={`${ui.card} group`} open={!a.hora}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold text-titulo">{a.titulo}</span>
              <span className="text-xs text-stone-500 first-letter:uppercase">
                {fechaLarga(a.fecha)}{a.hora ? ` · ${a.hora.slice(0, 5)}${a.hora_fin ? `–${a.hora_fin.slice(0, 5)}` : ""}` : " · sin hora"}
              </span>
            </span>
            <span className="text-stone-400 group-open:rotate-180">▾</span>
          </summary>
          <Formulario action={actualizarActividad} className="mt-5 space-y-5">
            <input type="hidden" name="id" value={a.id} />
            <ActividadCampos a={a} />
            <div className="flex items-center justify-between gap-3">
              <Link href={`/actividades/${a.id}`} className={ui.btnMini}>Abrir actividad</Link>
              <Submit>Guardar</Submit>
            </div>
          </Formulario>
        </details>
      ))}
    </div>
  );
}
