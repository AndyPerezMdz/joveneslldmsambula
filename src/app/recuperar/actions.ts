"use server";

import { createClient } from "@/lib/supabase/server";

type Estado = { ok: boolean; mensaje: string } | null;

export async function pedirCorreo(_prev: Estado, formData: FormData): Promise<Estado> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, mensaje: "Escribe un correo válido." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error && /rate|limit/i.test(error.message)) {
    return { ok: false, mensaje: "Ya pediste uno hace poco. Espera un par de minutos." };
  }
  // Mismo mensaje exista o no la cuenta (para no andar revelando quién tiene cuenta)
  return { ok: true, mensaje: "Si ese correo tiene cuenta, te llega un enlace para poner una contraseña nueva." };
}
