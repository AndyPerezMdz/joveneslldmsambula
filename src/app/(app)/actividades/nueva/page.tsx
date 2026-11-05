import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { hoy } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { puedeOrganizar } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { ActividadCampos } from "../ActividadCampos";
import { crearActividad } from "../actions";

export const metadata = { title: "Nueva actividad" };

export default async function Nueva() {
  await requerir(puedeOrganizar);
  return (
    <div className="space-y-6">
      <Link href="/actividades" className="text-sm text-stone-500 hover:text-titulo">← Actividades</Link>
      <h1 className={ui.h1}>Nueva actividad</h1>
      <Formulario action={crearActividad} className={`${ui.card} space-y-6`}>
        <ActividadCampos fecha={hoy()} />
        <div className="flex justify-end"><Submit>Crear actividad</Submit></div>
      </Formulario>
    </div>
  );
}
