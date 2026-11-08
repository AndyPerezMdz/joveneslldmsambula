import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { Encabezado } from "@/components/Tarjeta";
import { fechaLarga } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { marcarIdea } from "../participar/actions";

export const metadata = { title: "Buzón de ideas" };

type Idea = { id: string; texto: string; leida: boolean; created_at: string; perfiles: { nombre: string } | null };

export default async function Ideas() {
  const { supabase } = await requerir(esAdmin);
  const { data } = await supabase.from("ideas").select("id, texto, leida, created_at, perfiles(nombre)")
    .order("leida").order("created_at", { ascending: false }).limit(200);
  const ideas = (data ?? []) as unknown as Idea[];
  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado titulo="Buzón de ideas" sub="Lo que proponen los jóvenes desde su inicio." />
      {ideas.length === 0 && (
        <p className="rounded-3xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">Todavía nadie ha mandado nada.</p>
      )}
      <ul className="escalonado space-y-3">
        {ideas.map((x) => (
          <li key={x.id} className={`${ui.card} space-y-2 p-5 ${x.leida ? "opacity-60" : ""}`}>
            <p className="whitespace-pre-line">{x.texto}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              <span>{x.perfiles?.nombre ?? "(cuenta borrada)"} · {fechaLarga(new Date(x.created_at).toLocaleDateString("en-CA", { timeZone: "America/Merida" }))}</span>
              <Formulario action={marcarIdea} silencioso>
                <input type="hidden" name="id" value={x.id} />
                <input type="hidden" name="leida" value={x.leida ? "false" : "true"} />
                <Submit variante="btnMini">{x.leida ? "Marcar como nueva" : "Ya la leí"}</Submit>
              </Formulario>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
