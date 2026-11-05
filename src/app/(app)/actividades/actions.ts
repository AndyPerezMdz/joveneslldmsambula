"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteCon, intentar, ok, opt, txt, type Resultado } from "@/lib/forms";
import { enEquipo, puedeOrganizar, TIPOS, type TipoActividad } from "@/lib/tipos";

function datos(fd: FormData) {
  const titulo = txt(fd, "titulo");
  const fecha = txt(fd, "fecha");
  const tipo = txt(fd, "tipo") as TipoActividad;
  if (!titulo) throw new Error("Ponle nombre a la actividad.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Elige la fecha.");
  if (!TIPOS.some((t) => t.v === tipo)) throw new Error("Elige el tipo de actividad.");
  return { titulo, fecha, tipo, hora: opt(fd, "hora"), lugar: opt(fd, "lugar"), notas: opt(fd, "notas") };
}

export async function crearActividad(_p: Resultado, fd: FormData): Promise<Resultado> {
  let id = "";
  const r = await intentar(async () => {
    const { supabase } = await clienteCon(puedeOrganizar);
    const { data, error } = await supabase.from("actividades").insert(datos(fd)).select("id").single();
    ok(error);
    id = data!.id;
  });
  if (!r?.ok) return r;
  revalidatePath("/");
  redirect(`/actividades/${id}`);
}

export async function actualizarActividad(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(puedeOrganizar);
    const { error } = await supabase.from("actividades").update(datos(fd)).eq("id", txt(fd, "id"));
    ok(error);
    revalidatePath("/", "layout");
  }, "Actividad guardada.");
}

export async function borrarActividad(_p: Resultado, fd: FormData): Promise<Resultado> {
  const r = await intentar(async () => {
    const { supabase } = await clienteCon(puedeOrganizar);
    const { error } = await supabase.from("actividades").delete().eq("id", txt(fd, "id"));
    ok(error);
  });
  if (!r?.ok) return r;
  revalidatePath("/", "layout");
  redirect("/actividades");
}

/** Llegó alguien que no está en la lista: se da de alta y se marca presente. */
export async function agregarYMarcar(_p: Resultado, fd: FormData): Promise<Resultado> {
  const nombre = txt(fd, "nombre").replace(/\s+/g, " ");
  return intentar(async () => {
    const { supabase } = await clienteCon((p) => enEquipo(p, "asistencia"));
    if (nombre.length < 2) throw new Error("Escribe su nombre.");
    const { data, error } = await supabase.from("jovenes").insert({ nombre }).select("id").single();
    ok(error);
    const { error: e2 } = await supabase
      .from("asistencias")
      .insert({ actividad_id: txt(fd, "actividad_id"), joven_id: data!.id });
    ok(e2);
    revalidatePath(`/actividades/${txt(fd, "actividad_id")}`);
  }, `${nombre} agregado y marcado.`);
}
