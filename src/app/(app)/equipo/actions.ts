"use server";

import { revalidatePath } from "next/cache";
import { bool, clienteCon, intentar, ok, txt, type Resultado } from "@/lib/forms";
import { EQUIPOS, esAdmin, ROLES, veEquipo, type Equipo, type RolApp } from "@/lib/tipos";

const equipo = (fd: FormData) => {
  const e = txt(fd, "equipo") as Equipo;
  if (!EQUIPOS.some((x) => x.v === e)) throw new Error("Grupo inválido.");
  return e;
};

/** Admin o encargado del grupo: agregar a alguien con cuenta. */
export async function agregarAGrupo(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(veEquipo);
    const perfil = txt(fd, "perfil");
    if (!perfil) throw new Error("Elige a quién vas a agregar.");
    ok((await supabase.rpc("agregar_a_grupo", { p_perfil: perfil, p_equipo: equipo(fd) })).error);
    revalidatePath("/", "layout");
  }, "Agregado al grupo.");
}

export async function quitarDeGrupo(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(veEquipo);
    ok((await supabase.rpc("quitar_de_grupo", { p_perfil: txt(fd, "perfil"), p_equipo: equipo(fd) })).error);
    revalidatePath("/", "layout");
  }, "Quitado del grupo.");
}

/** Solo admin: nombrar o quitar al encargado de un grupo. */
export async function cambiarLider(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(esAdmin);
    const lider = bool(fd, "lider");
    ok((await supabase.rpc("cambiar_lider", { p_perfil: txt(fd, "perfil"), p_equipo: equipo(fd), p_lider: lider })).error);
    revalidatePath("/", "layout");
  }, bool(fd, "lider") ? "Ahora es encargado del grupo." : "Ya no es encargado del grupo.");
}

/** Solo admin: rol general (admin / encargado general / sin rol) y nombre. */
export async function cambiarRol(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase, perfil } = await clienteCon(esAdmin);
    const id = txt(fd, "perfil");
    const rol = txt(fd, "rol") as RolApp;
    if (!ROLES.some((r) => r.v === rol)) throw new Error("Rol inválido.");
    if (id === perfil.id && rol !== "admin") throw new Error("No te puedes quitar el admin a ti mismo.");
    const cambios: { rol: RolApp; nombre?: string } = { rol };
    const nombre = txt(fd, "nombre").replace(/\s+/g, " ");
    if (nombre) {
      if (nombre.length < 2) throw new Error("Escribe el nombre.");
      cambios.nombre = nombre;
    }
    ok((await supabase.from("perfiles").update(cambios).eq("id", id)).error);
    revalidatePath("/", "layout");
  }, "Guardado.");
}
