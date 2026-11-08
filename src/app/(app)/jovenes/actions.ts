"use server";

import { revalidatePath } from "next/cache";
import { bool, clienteCon, intentar, ok, opt, txt, type Resultado } from "@/lib/forms";
import { enEquipo } from "@/lib/tipos";

const permiso = (p: Parameters<typeof enEquipo>[0]) => enEquipo(p, "asistencia");

function datos(fd: FormData) {
  const nombre = txt(fd, "nombre").replace(/\s+/g, " ");
  if (nombre.length < 2) throw new Error("Escribe el nombre.");
  const email = opt(fd, "email")?.toLowerCase() ?? null;
  return { nombre, email, telefono: opt(fd, "telefono") };
}

export async function crearJoven(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(permiso);
    const d = datos(fd);
    ok((await supabase.from("jovenes").insert(d)).error);
    revalidatePath("/", "layout");
  }, "Joven agregado.");
}

export async function actualizarJoven(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(permiso);
    ok((await supabase.from("jovenes").update({ ...datos(fd), activo: bool(fd, "activo") }).eq("id", txt(fd, "id"))).error);
    revalidatePath("/", "layout");
  }, "Guardado.");
}

export async function borrarJoven(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(permiso);
    ok((await supabase.from("jovenes").delete().eq("id", txt(fd, "id"))).error);
    revalidatePath("/", "layout");
  }, "Borrado.");
}

/** Dos fichas de la misma persona: se queda esta (id) y absorbe a la otra (origen). */
export async function fusionarJoven(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(permiso);
    const origen = txt(fd, "origen");
    if (!origen) throw new Error("Elige la ficha repetida.");
    ok((await supabase.rpc("fusionar_jovenes", { p_origen: origen, p_destino: txt(fd, "id") })).error);
    revalidatePath("/", "layout");
  }, "Fichas juntadas.");
}

/** El aviso de "se parecen" estaba mal: son dos personas distintas. */
export async function sonDistintas(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(permiso);
    const [a, b] = [txt(fd, "a"), txt(fd, "b")].sort();
    if (!a || !b || a === b) throw new Error("Faltan las dos fichas.");
    const { error } = await supabase.from("fichas_distintas").insert({ a, b });
    if (error && error.code !== "23505") ok(error);
    revalidatePath("/", "layout");
  }, "Listo, ya no se avisa de esas dos.");
}
