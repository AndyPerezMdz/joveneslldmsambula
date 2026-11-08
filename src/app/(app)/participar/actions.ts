"use server";

import { revalidatePath } from "next/cache";
import { leerMonto } from "@/lib/dinero";
import { bool, clienteCon, intentar, ok, opt, txt, type Resultado } from "@/lib/forms";
import { enEquipo, esAdmin, type Perfil } from "@/lib/tipos";

const cualquiera = () => true;
const finanzas = (p: Perfil) => enEquipo(p, "finanzas");

// ---------- ¿Quién puede? ----------
export async function crearTarea(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(esAdmin);
    const nombre = txt(fd, "nombre").replace(/\s+/g, " ");
    if (!nombre) throw new Error("¿Qué hay que hacer? (ej. Vender, Cocinar, Acomodar sillas)");
    const cupo = Number(txt(fd, "cupo")) || null;
    if (cupo !== null && (cupo < 1 || cupo > 200)) throw new Error("¿Cuántos se necesitan? Déjalo vacío si son los que sean.");
    ok((await supabase.from("tareas").insert({ actividad_id: txt(fd, "actividad_id"), nombre, cupo })).error);
    revalidatePath("/", "layout");
  }, "Tarea agregada.");
}

export async function borrarTarea(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(esAdmin);
    ok((await supabase.from("tareas").delete().eq("id", txt(fd, "id"))).error);
    revalidatePath("/", "layout");
  }, "Tarea quitada.");
}

/** El admin agrega (o quita) a alguien que contestó por WhatsApp. */
export async function cambiarVoluntario(_p: Resultado, fd: FormData): Promise<Resultado> {
  const si = bool(fd, "si");
  return intentar(async () => {
    const { supabase } = await clienteCon(esAdmin);
    const fila = { tarea_id: txt(fd, "tarea_id"), joven_id: txt(fd, "joven_id") };
    if (!fila.joven_id) throw new Error("Elige a quién.");
    const { error } = si
      ? await supabase.from("tarea_voluntarios").insert(fila)
      : await supabase.from("tarea_voluntarios").delete().match(fila);
    if (error && error.code !== "23505") ok(error);
    revalidatePath("/", "layout");
  }, si ? "Agregado." : "Quitado.");
}

/** Cada quien se apunta (o se baja) solo. */
export async function apuntarme(_p: Resultado, fd: FormData): Promise<Resultado> {
  const si = bool(fd, "si");
  return intentar(async () => {
    const { supabase } = await clienteCon(cualquiera);
    ok((await supabase.rpc("apuntarme", { p_tarea: txt(fd, "tarea_id"), p_si: si })).error);
    revalidatePath("/", "layout");
  }, si ? "¡Te apuntaste! Gracias." : "Listo, te bajaste.");
}

// ---------- Ya pagué ----------
export async function avisarPago(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(cualquiera);
    const monto = leerMonto(txt(fd, "monto"));
    if (!monto) throw new Error("Escribe cuánto diste.");
    ok((await supabase.rpc("avisar_pago", {
      p_cooperacion: txt(fd, "cooperacion_id"), p_monto: monto, p_recibio: opt(fd, "recibio"), p_nota: opt(fd, "nota"),
    })).error);
    revalidatePath("/", "layout");
  }, "Listo. En cuanto finanzas lo confirme, se descuenta.");
}

export async function revisarAviso(_p: Resultado, fd: FormData): Promise<Resultado> {
  const si = bool(fd, "confirmar");
  return intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    ok((await supabase.rpc("revisar_aviso", { p_id: txt(fd, "id"), p_confirmar: si, p_motivo: opt(fd, "motivo") })).error);
    revalidatePath("/", "layout");
  }, si ? "Pago confirmado y registrado." : "Aviso rechazado.");
}

// ---------- Buzón de ideas ----------
export async function mandarIdea(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase, perfil } = await clienteCon(cualquiera);
    const texto = txt(fd, "texto");
    if (texto.length < 3) throw new Error("Escribe tu idea.");
    if (texto.length > 1000) throw new Error("Muy larga: resúmela un poco (máximo 1000 letras).");
    ok((await supabase.from("ideas").insert({ texto, perfil_id: perfil.id })).error);
    revalidatePath("/ideas");
  }, "¡Gracias! Tu idea le llegó al admin.");
}

export async function marcarIdea(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(esAdmin);
    ok((await supabase.from("ideas").update({ leida: bool(fd, "leida") }).eq("id", txt(fd, "id"))).error);
    revalidatePath("/", "layout");
  }, "Listo.");
}
