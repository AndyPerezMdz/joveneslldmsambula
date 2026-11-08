"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteCon, intentar, ok, txt, type Resultado } from "@/lib/forms";

const cualquiera = () => true;

export async function cambiarNombre(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(cualquiera);
    const nombre = txt(fd, "nombre").replace(/\s+/g, " ");
    if (nombre.split(" ").length < 2) throw new Error("Escribe tu nombre completo: nombre y al menos un apellido.");
    ok((await supabase.rpc("cambiar_mi_nombre", { p_nombre: nombre })).error);
    revalidatePath("/", "layout");
  }, "Nombre actualizado.");
}

export async function borrarCuenta(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(cualquiera);
    if (txt(fd, "confirmacion").toUpperCase() !== "BORRAR") throw new Error('Escribe BORRAR para confirmar.');
    ok((await supabase.rpc("borrar_mi_cuenta")).error);
    await supabase.auth.signOut();
    redirect("/login?aviso=borrada");
  });
}
