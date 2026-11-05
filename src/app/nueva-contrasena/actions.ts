"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function cambiarContrasena(_prev: string | null, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const repetir = String(formData.get("repetir") ?? "");
  if (password.length < 8) return "La contraseña necesita mínimo 8 caracteres.";
  if (password !== repetir) return "Las contraseñas no coinciden.";

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different|same/i.test(error.message)) return "Tiene que ser distinta a la anterior.";
    return "No se pudo cambiar. Pide otro enlace e intenta de nuevo.";
  }
  redirect("/");
}
