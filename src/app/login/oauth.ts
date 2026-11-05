"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Proveedor = "google" | "apple";

/** Manda a la persona a Google/Apple; regresa a /auth/callback con un código. */
export async function entrarCon(formData: FormData) {
  const proveedor = String(formData.get("proveedor")) as Proveedor;
  const next = String(formData.get("next") ?? "/");
  if (proveedor !== "google" && proveedor !== "apple") redirect("/login");

  const origen = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${(await headers()).get("host")}`;
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: proveedor,
    options: { redirectTo: `${origen}/auth/callback?next=${encodeURIComponent(destino)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
