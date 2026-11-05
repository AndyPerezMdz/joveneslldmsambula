import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { hoy, sumarDias } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, SELECT_CAT, type Categoria } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { registrarMovimiento } from "../actions";
import { CamposMovimiento } from "./CamposMovimiento";

export const metadata = { title: "Registrar movimiento" };

export default async function NuevoMovimiento({ searchParams }: { searchParams: Promise<{ actividad?: string; tipo?: string }> }) {
  const { supabase } = await requerir((p) => enEquipo(p, "finanzas"));
  const { actividad, tipo } = await searchParams;
  const h = hoy();
  const [{ data }, { data: cats }] = await Promise.all([
    supabase.from("actividades").select("id, titulo, fecha")
      .gte("fecha", sumarDias(h, -90)).lte("fecha", sumarDias(h, 60))
      .order("fecha", { ascending: false }),
    supabase.from("categorias").select(SELECT_CAT).eq("activa", true).order("orden").order("nombre"),
  ]);
  const volver = actividad ? `/actividades/${actividad}` : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={volver || "/finanzas"} className="text-sm text-stone-500 hover:text-titulo">← Volver</Link>
      <h1 className={ui.h1}>Registrar movimiento</h1>
      <Formulario action={registrarMovimiento} className={`${ui.card} space-y-6`}>
        <input type="hidden" name="volver" value={volver} />
        <CamposMovimiento tipoInicial={tipo === "entrada" ? "entrada" : "salida"} fecha={h} actividades={data ?? []} actividad={actividad} categorias={(cats ?? []) as Categoria[]} />
        <p className="text-xs text-stone-500">Una vez guardado no se edita. Si te equivocas, se anula y se registra otra vez.</p>
        <div className="flex justify-end"><Submit>Guardar</Submit></div>
      </Formulario>
    </div>
  );
}
