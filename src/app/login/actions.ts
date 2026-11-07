"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function iniciarSesion(_prev: string | null, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Decir QUÉ pasó (antes todo era "incorrectos" y no había forma de saber)
    if (/not confirmed/i.test(error.message)) return "Tu correo todavía no está confirmado. Busca el correo de confirmación (revisa también spam).";
    if (/rate|too many/i.test(error.message)) return "Demasiados intentos. Espera un minuto y vuelve a intentar.";
    if (/invalid/i.test(error.message)) return "Correo o contraseña incorrectos.";
    return `No se pudo entrar: ${error.message}`;
  }

  // Nunca regresar al login después de entrar
  const destino = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
  redirect(destino);
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
