"use server";

import { revalidatePath } from "next/cache";
import { clienteCon, ok } from "@/lib/forms";
import { normalizar } from "@/lib/nombres";
import { enEquipo } from "@/lib/tipos";

type Fila = { nombre: string; email: string | null; telefono: string | null };
type Estado = { ok: boolean; mensaje: string } | null;

export async function importarJovenes(_p: Estado, fd: FormData): Promise<Estado> {
  try {
    const { supabase } = await clienteCon((p) => enEquipo(p, "asistencia"));
    const filas = JSON.parse(String(fd.get("filas") ?? "[]")) as Fila[];
    if (!Array.isArray(filas) || filas.length === 0) return { ok: false, mensaje: "No hay nadie nuevo que agregar." };
    if (filas.length > 500) return { ok: false, mensaje: "Son demasiados de un jalón (máximo 500)." };

    // Volver a revisar contra la base (por si alguien agregó mientras tanto)
    const { data: hay } = await supabase.from("jovenes").select("nombre");
    const existentes = new Set((hay ?? []).map((j: { nombre: string }) => normalizar(j.nombre)));
    const vistos = new Set<string>();
    const nuevos = filas
      .map((f) => ({
        nombre: String(f.nombre ?? "").trim().replace(/\s+/g, " "),
        email: f.email ? String(f.email).trim().toLowerCase() : null,
        telefono: f.telefono ? String(f.telefono).trim() : null,
      }))
      .filter((f) => {
        const k = normalizar(f.nombre);
        if (f.nombre.length < 2 || existentes.has(k) || vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });
    if (nuevos.length === 0) return { ok: false, mensaje: "Todos ya estaban en la lista." };

    ok((await supabase.from("jovenes").insert(nuevos)).error);
    revalidatePath("/", "layout");
    return { ok: true, mensaje: `Listo: ${nuevos.length} ${nuevos.length === 1 ? "joven agregado" : "jóvenes agregados"}.` };
  } catch (e) {
    return { ok: false, mensaje: e instanceof Error ? e.message : "No se pudo importar." };
  }
}
