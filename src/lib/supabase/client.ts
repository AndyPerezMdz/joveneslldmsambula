import { createBrowserClient } from "@supabase/ssr";

/** Cliente para el navegador (pase de lista sin recargar la página). */
export function clienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
