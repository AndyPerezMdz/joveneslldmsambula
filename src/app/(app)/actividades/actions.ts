"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bool, clienteCon, intentar, ok, opt, txt, type Resultado } from "@/lib/forms";
import { hoy } from "@/lib/fechas";
import { bloqueoLista, enEquipo, esAdmin, esEncargado, esLider, puedeOrganizar, TIPOS, type TipoActividad } from "@/lib/tipos";

function datos(fd: FormData) {
  const titulo = txt(fd, "titulo");
  const fecha = txt(fd, "fecha");
  const tipo = txt(fd, "tipo") as TipoActividad;
  if (!titulo) throw new Error("Ponle nombre a la actividad.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Elige la fecha.");
  if (!TIPOS.some((t) => t.v === tipo)) throw new Error("Elige el tipo de actividad.");
  return { titulo, fecha, tipo, hora: opt(fd, "hora"), hora_fin: opt(fd, "hora_fin"), lugar: opt(fd, "lugar"), notas: opt(fd, "notas") };
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

/** Importar: crea varias de un jalón y manda a revisarlas. */
export async function crearActividades(_p: Resultado, fd: FormData): Promise<Resultado> {
  let ids: string[] = [];
  const r = await intentar(async () => {
    const { supabase } = await clienteCon(puedeOrganizar);
    let crudas: Record<string, string>[];
    try { crudas = JSON.parse(txt(fd, "filas")); } catch { throw new Error("No se entendió la lista."); }
    if (!Array.isArray(crudas) || !crudas.length) throw new Error("No hay actividades marcadas.");
    if (crudas.length > 60) throw new Error("Son demasiadas de un jalón (máximo 60).");
    const filas = crudas.map((x, i) => {
      const titulo = String(x.titulo ?? "").trim().replace(/\s+/g, " ");
      const fecha = String(x.fecha ?? "");
      const tipo = String(x.tipo ?? "otra") as TipoActividad;
      const hora = /^\d{2}:\d{2}$/.test(x.hora ?? "") ? x.hora : null;
      const hora_fin = /^\d{2}:\d{2}$/.test(x.hora_fin ?? "") ? x.hora_fin : null;
      if (!titulo) throw new Error(`La actividad ${i + 1} no tiene nombre.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error(`"${titulo}" no tiene fecha.`);
      if (!TIPOS.some((t) => t.v === tipo)) throw new Error(`"${titulo}" tiene un tipo raro.`);
      return { titulo, fecha, tipo, hora, hora_fin, lugar: String(x.lugar ?? "").trim() || null, notas: String(x.notas ?? "").trim() || null };
    });
    const { data, error } = await supabase.from("actividades").insert(filas).select("id");
    ok(error);
    ids = (data ?? []).map((x: { id: string }) => x.id);
  });
  if (!r?.ok) return r;
  revalidatePath("/", "layout");
  redirect(`/actividades/importar/revisar?ids=${ids.join(",")}`);
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
    const id = txt(fd, "id");
    // Las de horario fijo no se borran (se volverían a crear): se cancelan
    const { data } = await supabase.from("actividades").select("horario_id").eq("id", id).maybeSingle();
    const { error } = data?.horario_id
      ? await supabase.from("actividades").update({ cancelada: true }).eq("id", id)
      : await supabase.from("actividades").delete().eq("id", id);
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
    const { supabase, perfil } = await clienteCon((p) => enEquipo(p, "asistencia"));
    if (nombre.length < 2) throw new Error("Escribe su nombre.");
    // Antes de crear la ficha: que sí se pueda pasar lista en esta actividad
    const { data: act } = await supabase.from("actividades").select("fecha, cancelada").eq("id", txt(fd, "actividad_id")).maybeSingle();
    if (!act) throw new Error("No se encontró la actividad.");
    const b = bloqueoLista(act, hoy(), esEncargado(perfil) || esLider(perfil, "asistencia"));
    if (b) throw new Error(b);
    const { data, error } = await supabase.from("jovenes").insert({ nombre }).select("id").single();
    ok(error);
    const { error: e2 } = await supabase
      .from("asistencias")
      .insert({ actividad_id: txt(fd, "actividad_id"), joven_id: data!.id });
    ok(e2);
    revalidatePath(`/actividades/${txt(fd, "actividad_id")}`);
  }, `${nombre} agregado y marcado.`);
}

export async function reactivarActividad(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(puedeOrganizar);
    ok((await supabase.from("actividades").update({ cancelada: false }).eq("id", txt(fd, "id"))).error);
    revalidatePath("/", "layout");
  }, "Actividad reactivada.");
}

// ---------- Horarios fijos ----------
function datosHorario(fd: FormData) {
  const titulo = txt(fd, "titulo");
  const dias = fd.getAll("dias").map(Number).filter((d) => d >= 1 && d <= 7);
  const hora = txt(fd, "hora");
  const tipo = txt(fd, "tipo") as TipoActividad;
  if (!titulo) throw new Error("Ponle nombre.");
  if (!dias.length) throw new Error("Elige al menos un día.");
  if (!/^\d{2}:\d{2}/.test(hora)) throw new Error("Elige la hora.");
  if (!TIPOS.some((t) => t.v === tipo)) throw new Error("Elige el tipo.");
  return { titulo, dias, hora, tipo, hora_fin: opt(fd, "hora_fin"), lugar: opt(fd, "lugar") };
}

export async function crearHorario(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(esAdmin);
    ok((await supabase.from("horarios").insert(datosHorario(fd))).error);
    revalidatePath("/", "layout");
  }, "Horario agregado. Sus actividades se crean solas.");
}

export async function actualizarHorario(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(esAdmin);
    ok((await supabase.from("horarios").update({ ...datosHorario(fd), activo: bool(fd, "activo") }).eq("id", txt(fd, "id"))).error);
    revalidatePath("/", "layout");
  }, "Horario guardado. Las actividades que vienen ya se ajustaron.");
}
