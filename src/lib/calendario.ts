import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

/**
 * Crea (si faltan) las actividades de los horarios fijos entre dos fechas.
 * Es barato y no duplica, así que se llama cada vez que alguien abre el calendario.
 */
export async function asegurarDias(supabase: Cliente, desde: string, hasta: string) {
  await supabase.rpc("generar_actividades", { p_desde: desde, p_hasta: hasta });
}
