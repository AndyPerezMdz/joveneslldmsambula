"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerMonto } from "@/lib/dinero";
import { bool, clienteCon, intentar, ok, opt, txt, type Resultado } from "@/lib/forms";
import { CATEGORIAS, enEquipo, type CategoriaMov, type Perfil, type TipoMov } from "@/lib/tipos";

const finanzas = (p: Perfil) => enEquipo(p, "finanzas");
const fechaOk = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f);

export async function registrarMovimiento(_p: Resultado, fd: FormData): Promise<Resultado> {
  let mes = "";
  const r = await intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    const tipo = txt(fd, "tipo") as TipoMov;
    const categoria = txt(fd, "categoria") as CategoriaMov;
    const monto = leerMonto(txt(fd, "monto"));
    const fecha = txt(fd, "fecha");
    if (tipo !== "entrada" && tipo !== "salida") throw new Error("¿Entró o salió dinero?");
    if (!CATEGORIAS.some((c) => c.v === categoria)) throw new Error("Elige una categoría.");
    if (!monto) throw new Error("Escribe un monto válido.");
    if (!fechaOk(fecha)) throw new Error("Elige la fecha.");
    if (!txt(fd, "concepto")) throw new Error("Escribe en qué se gastó o de dónde salió.");
    ok((await supabase.from("movimientos").insert({
      tipo, categoria, monto, fecha,
      concepto: txt(fd, "concepto"),
      actividad_id: opt(fd, "actividad_id"),
    })).error);
    mes = fecha.slice(0, 7);
  });
  if (!r?.ok) return r;
  revalidatePath("/", "layout");
  const volver = txt(fd, "volver");
  redirect(volver.startsWith("/") ? volver : `/finanzas?mes=${mes}`);
}

export async function anularMovimiento(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    const motivo = txt(fd, "motivo");
    if (motivo.length < 3) throw new Error("Escribe por qué se anula.");
    ok((await supabase.from("movimientos").update({ anulado: true, anulado_motivo: motivo }).eq("id", txt(fd, "id"))).error);
    revalidatePath("/", "layout");
  }, "Movimiento anulado.");
}

// ---------- Cooperaciones ----------
export async function crearCooperacion(_p: Resultado, fd: FormData): Promise<Resultado> {
  let id = "";
  const r = await intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    const monto = leerMonto(txt(fd, "monto"));
    if (!txt(fd, "concepto")) throw new Error("¿Para qué es la cooperación?");
    if (!monto) throw new Error("Escribe cuánto da cada quien.");
    const { data, error } = await supabase.from("cooperaciones").insert({
      concepto: txt(fd, "concepto"), monto,
      fecha_limite: opt(fd, "fecha_limite"),
      actividad_id: opt(fd, "actividad_id"),
    }).select("id").single();
    ok(error);
    id = data!.id;
  });
  if (!r?.ok) return r;
  revalidatePath("/", "layout");
  redirect(`/finanzas/cooperaciones/${id}`);
}

/** Registra lo que dio un joven: es una ENTRADA ligada a la cooperación. */
export async function registrarPago(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    const monto = leerMonto(txt(fd, "monto"));
    if (!monto) throw new Error("Escribe cuánto dio.");
    ok((await supabase.from("movimientos").insert({
      tipo: "entrada", categoria: "cooperacion", monto,
      concepto: txt(fd, "concepto"),
      cooperacion_id: txt(fd, "cooperacion_id"),
      joven_id: txt(fd, "joven_id"),
      actividad_id: opt(fd, "actividad_id"),
    })).error);
    revalidatePath("/", "layout");
  }, "Pago registrado.");
}

export async function cambiarExclusion(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    const fila = { cooperacion_id: txt(fd, "cooperacion_id"), joven_id: txt(fd, "joven_id") };
    const q = bool(fd, "excluir")
      ? supabase.from("cooperacion_excluidos").insert(fila)
      : supabase.from("cooperacion_excluidos").delete().match(fila);
    ok((await q).error);
    revalidatePath("/", "layout");
  });
}

export async function cerrarCooperacion(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    ok((await supabase.from("cooperaciones").update({ cerrada: bool(fd, "cerrada") }).eq("id", txt(fd, "id"))).error);
    revalidatePath("/", "layout");
  }, bool(fd, "cerrada") ? "Cooperación cerrada." : "Cooperación reabierta.");
}
