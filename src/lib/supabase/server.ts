import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Perfil } from "@/lib/tipos";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: el proxy refresca la sesión.
          }
        },
      },
    },
  );
}

/** Usuario + perfil actual (puede ser null). */
export async function getSesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, perfil: null } as const;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, equipos")
    .eq("id", user.id)
    .single<Perfil>();

  return { supabase, user, perfil } as const;
}

/** Para páginas internas: sin sesión → /login. */
export async function requerirMiembro() {
  const s = await getSesion();
  if (!s.user || !s.perfil) redirect("/login");
  return { supabase: s.supabase, user: s.user, perfil: s.perfil };
}

/** Para páginas con permiso: si no lo tiene, de regreso al inicio. */
export async function requerir(permiso: (p: Perfil) => boolean) {
  const s = await requerirMiembro();
  if (!permiso(s.perfil)) redirect("/");
  return s;
}
