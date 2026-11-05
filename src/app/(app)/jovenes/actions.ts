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
