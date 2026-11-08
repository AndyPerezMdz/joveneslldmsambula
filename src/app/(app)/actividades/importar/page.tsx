import Link from "next/link";
import { Encabezado } from "@/components/Tarjeta";
import { hoy, sumarDias } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/tipos";
import { ImportarActividades } from "./ImportarActividades";

export const metadata = { title: "Importar actividades" };

export default async function Importar() {
  const { supabase } = await requerir(esAdmin);
  const h = hoy();
  const { data } = await supabase.from("actividades").select("fecha, titulo")
    .is("horario_id", null).gte("fecha", sumarDias(h, -60)).lte("fecha", sumarDias(h, 400));
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/actividades" className="text-sm text-stone-500 hover:text-titulo">← Actividades</Link>
      <div className="mt-2">
        <Encabezado titulo="Importar actividades" sub="Pega el mensaje del mes tal cual llega. Antes de crear, revisas cada una." />
      </div>
      <ImportarActividades hoy={h} existentes={(data ?? []) as { fecha: string; titulo: string }[]} />
    </div>
  );
}
