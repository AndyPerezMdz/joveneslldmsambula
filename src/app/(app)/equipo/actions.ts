"use server";

import { revalidatePath } from "next/cache";
import { clienteCon, intentar, ok, txt, type Resultado } from "@/lib/forms";
import { EQUIPOS, esAdmin, ROLES, type Equipo, type RolApp } from "@/lib/tipos";

function leer(fd: FormData) {
  const rol = txt(fd, "rol") as RolApp;
  const equipos = fd.getAll("equipos").map(String).filter((e): e is Equipo => EQUIPOS.some((x) => x.v === e));
  if (!ROLES.some((r) => r.v === rol)) throw new Error("Rol inválido.");
  return { rol, equipos };
}

/** Elige a alguien que ya tiene cuenta y le da rol y equipos. */
export async function agregarAlEquipo(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(esAdmin);
    const id = txt(fd, "id");
    if (!id) throw new Error("Elige a quién vas a agregar.");
    const { rol, equipos } = leer(fd);
    if (rol === "joven" && equipos.length === 0) throw new Error("Dale un rol o al menos un equipo.");
    ok((await supabase.from("perfiles").update({ rol, equipos }).eq("id", id)).error);
    revalidatePath("/", "layout");
  }, "Agregado al equipo.");
}

export async function actualizarCuenta(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase, perfil } = await clienteCon(esAdmin);
    const id = txt(fd, "id");
    const { rol, equipos } = leer(fd);
    // Apple a veces no manda el nombre: aquí se corrige
    const nombre = txt(fd, "nombre").replace(/\s+/g, " ");
    if (nombre.length < 2) throw new Error("Escribe el nombre.");
    if (id === perfil.id && rol !== "admin") throw new Error("No te puedes quitar el admin a ti mismo.");
    ok((await supabase.from("perfiles").update({ nombre, rol, equipos }).eq("id", id)).error);
    revalidatePath("/", "layout");
  }, "Cuenta actualizada.");
}

/** Vuelve a ser solo joven (sigue en la lista de Jóvenes). */
export async function quitarDelEquipo(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase, perfil } = await clienteCon(esAdmin);
    const id = txt(fd, "id");
    if (id === perfil.id) throw new Error("No te puedes quitar a ti mismo.");
    ok((await supabase.from("perfiles").update({ rol: "joven", equipos: [] }).eq("id", id)).error);
    revalidatePath("/", "layout");
  }, "Quitado del equipo.");
}
