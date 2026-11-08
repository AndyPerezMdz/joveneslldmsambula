import Link from "next/link";
import { notFound } from "next/navigation";
import { fechaLarga, horaBonita, hoy } from "@/lib/fechas";
import { requerirMiembro } from "@/lib/supabase/server";
import { esAdmin, SELECT_ACT, tipo, type Actividad } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { cargarTareas, Tareas } from "../../participar/Tareas";

export const metadata = { title: "¿Quién puede?" };

/** A donde llega el link del grupo de WhatsApp. */
export default async function Apuntarse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil } = await requerirMiembro();
  const { data: a } = await supabase.from("actividades").select(SELECT_ACT).eq("id", id).maybeSingle<Actividad>();
  if (!a) notFound();
  const [tareas, { data: yo }] = await Promise.all([
    cargarTareas(supabase, a.id),
    supabase.from("jovenes").select("id").eq("perfil_id", perfil.id).maybeSingle(),
  ]);
  const t = tipo(a.tipo);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="rounded-3xl bg-gradient-to-b from-marca-medio to-marca p-6 text-white">
        <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{t.n}</span>
        <h1 className="titulo mt-2 text-3xl font-semibold">{a.titulo}</h1>
        <p className="mt-1 text-white/75 first-letter:uppercase">
          {fechaLarga(a.fecha)}{a.hora && ` · ${horaBonita(a.hora)}${a.hora_fin ? ` a ${horaBonita(a.hora_fin)}` : ""}`}{a.lugar && ` · ${a.lugar}`}
        </p>
        {a.notas && <p className="mt-3 whitespace-pre-line text-sm text-white/85">{a.notas}</p>}
      </div>
      {!yo && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          Tu cuenta todavía no está ligada a la lista del grupo, así que no te puedes apuntar. Avísale al admin.
        </p>
      )}
      {tareas.length === 0 ? (
        <p className={`${ui.card} text-sm text-stone-500`}>Todavía no hay nada en qué apuntarse para esta actividad.</p>
      ) : (
        <Tareas a={a} tareas={tareas} miJoven={yo?.id ?? null} admin={false} cerrado={!!a.cancelada || a.fecha < hoy()} />
      )}
      <Link href={esAdmin(perfil) ? `/actividades/${a.id}` : "/"} className="block text-center text-sm text-stone-500 hover:text-titulo">
        {esAdmin(perfil) ? "Ver la actividad completa" : "Ir al inicio"}
      </Link>
    </div>
  );
}
