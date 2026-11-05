"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerMonto } from "@/lib/dinero";
import { driveListo, subirTicket } from "@/lib/drive";
import { bool, clienteCon, intentar, ok, opt, txt, type Resultado } from "@/lib/forms";
import { claveCategoria, enEquipo, type Perfil, type TipoMov } from "@/lib/tipos";

const finanzas = (p: Perfil) => enEquipo(p, "finanzas");
const fechaOk = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f);

export async function registrarMovimiento(_p: Resultado, fd: FormData): Promise<Resultado> {
  let mes = "";
  const r = await intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    const tipo = txt(fd, "tipo") as TipoMov;
    let categoria = txt(fd, "categoria");
    const monto = leerMonto(txt(fd, "monto"));
    const fecha = txt(fd, "fecha");
    if (tipo !== "entrada" && tipo !== "salida") throw new Error("¿Entró o salió dinero?");
    if (!categoria) throw new Error("Elige una categoría.");
    if (!monto) throw new Error("Escribe un monto válido.");
    if (!fechaOk(fecha)) throw new Error("Elige la fecha.");
    if (!txt(fd, "concepto")) throw new Error("Escribe en qué se gastó o de dónde salió.");

    // "Otra…": se crea la categoría en ese momento
    if (categoria === "__nueva") {
      categoria = await crearCat(supabase, txt(fd, "categoria_nueva"), tipo);
    }

    // Foto del ticket → Drive (Evidencias/Tickets)
    let comprobante: string | null = null;
    const ticket = fd.get("ticket");
    if (ticket instanceof File && ticket.size > 0) {
      if (!ticket.type.startsWith("image/")) throw new Error("El ticket tiene que ser una foto.");
      if (!driveListo()) throw new Error("El Drive no está conectado: guarda el movimiento sin foto.");
      comprobante = await subirTicket(ticket, `${fecha} · ${txt(fd, "concepto")} · ${monto}.jpg`);
    }

    ok((await supabase.from("movimientos").insert({
      tipo, categoria, monto, fecha, comprobante,
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

// ---------- Categorías ----------
type Cliente = Awaited<ReturnType<typeof clienteCon>>["supabase"];

/** Crea (o reactiva) una categoría y regresa su clave. */
async function crearCat(supabase: Cliente, nombre: string, tipo: string) {
  const n = nombre.trim().replace(/\s+/g, " ");
  if (n.length < 2) throw new Error("Escribe el nombre de la categoría nueva.");
  const id = claveCategoria(n);
  if (!id) throw new Error("Ese nombre de categoría no sirve.");
  const { data: porClave } = await supabase.from("categorias").select("id").eq("id", id).maybeSingle();
  const { data: porNombre } = porClave ? { data: null }
    : await supabase.from("categorias").select("id").ilike("nombre", n.replace(/[%_\\]/g, "\\$&")).maybeSingle();
  const hay = porClave ?? porNombre;
  if (hay) {
    ok((await supabase.from("categorias").update({ activa: true }).eq("id", hay.id)).error);
    return hay.id as string;
  }
  ok((await supabase.from("categorias").insert({ id, nombre: n.charAt(0).toUpperCase() + n.slice(1), tipo })).error);
  return id;
}

export async function crearCategoria(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    const tipo = txt(fd, "tipo");
    if (!["entrada", "salida", "ambos"].includes(tipo)) throw new Error("Elige si es de entrada o de salida.");
    await crearCat(supabase, txt(fd, "nombre"), tipo);
    revalidatePath("/finanzas", "layout");
  }, "Categoría agregada.");
}

export async function editarCategoria(_p: Resultado, fd: FormData): Promise<Resultado> {
  return intentar(async () => {
    const { supabase } = await clienteCon(finanzas);
    const nombre = txt(fd, "nombre").replace(/\s+/g, " ");
    const tipo = txt(fd, "tipo");
    if (nombre.length < 2) throw new Error("Escribe el nombre.");
    if (!["entrada", "salida", "ambos"].includes(tipo)) throw new Error("Elige el tipo.");
    ok((await supabase.from("categorias").update({ nombre, tipo, activa: bool(fd, "activa") }).eq("id", txt(fd, "id"))).error);
    revalidatePath("/finanzas", "layout");
  }, "Categoría guardada.");
}
