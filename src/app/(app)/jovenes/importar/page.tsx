import Link from "next/link";
import { Encabezado } from "@/components/Tarjeta";
import { normalizar } from "@/lib/nombres";
import { requerir } from "@/lib/supabase/server";
import { enEquipo } from "@/lib/tipos";
import { Importador } from "./Importador";

export const metadata = { title: "Importar jóvenes" };

export default async function Importar() {
  const { supabase } = await requerir((p) => enEquipo(p, "asistencia"));
  const { data } = await supabase.from("jovenes").select("nombre");
  return (
    <>
      <Link href="/jovenes" className="text-sm text-stone-500 hover:text-titulo">← Jóvenes</Link>
      <div className="mt-2"><Encabezado titulo="Importar lista" sub="Agrega a todos de una vez. Los que ya están no se duplican." /></div>
      <Importador existentes={(data ?? []).map((j: { nombre: string }) => normalizar(j.nombre))} />
    </>
  );
}
