"use server";

import { revalidatePath } from "next/cache";
import { clienteCon, intentar, ok, txt, type Resultado } from "@/lib/forms";
import { EQUIPOS, esAdmin, ROLES, type Equipo, type RolApp } from "@/lib/tipos";

export async function actualizarCuenta(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase, perfil } = await clienteCon(esAdmin);
    const id = txt(fd, "id");
    const rol = txt(fd, "rol") as RolApp;
    const equipos = fd.getAll("equipos").map(String).filter((e): e is Equipo => EQUIPOS.some((x) => x.v === e));
    const joven = txt(fd, "joven_id");

    if (!ROLES.some((r) => r.v === rol)) throw new Error("Rol inválido.");
    if (id === perfil.id && rol !== "admin") throw new Error("No te puedes quitar el admin a ti mismo.");

    ok((await supabase.from("perfiles").update({ rol, equipos }).eq("id", id)).error);

    // Ligar la cuenta con su ficha de joven (o desligar)
    ok((await supabase.from("jovenes").update({ perfil_id: null }).eq("perfil_id", id)).error);
    if (joven) ok((await supabase.from("jovenes").update({ perfil_id: id }).eq("id", joven)).error);

    revalidatePath("/", "layout");
  }, "Cuenta actualizada.");
}
