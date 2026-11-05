import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { Encabezado } from "@/components/Tarjeta";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, SELECT_CAT, type Categoria } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { crearCategoria, editarCategoria } from "../actions";

export const metadata = { title: "Categorías" };

const TIPOS = [{ v: "entrada", n: "Entrada" }, { v: "salida", n: "Salida" }, { v: "ambos", n: "Ambas" }];

export default async function Categorias() {
  const { supabase } = await requerir((p) => enEquipo(p, "finanzas"));
  const [{ data }, { data: usos }] = await Promise.all([
    supabase.from("categorias").select(SELECT_CAT).order("orden").order("nombre"),
    supabase.from("movimientos").select("categoria"),
  ]);
  const cats = (data ?? []) as Categoria[];
  const conteo = new Map<string, number>();
  for (const u of (usos ?? []) as { categoria: string }[]) conteo.set(u.categoria, (conteo.get(u.categoria) ?? 0) + 1);

  return (
    <>
      <Link href="/finanzas" className="text-sm text-stone-500 hover:text-titulo">← Finanzas</Link>
      <div className="mt-2"><Encabezado titulo="Categorías" sub="Las que no uses, desactívalas: dejan de salir al registrar, pero el historial se queda." /></div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-stone-200/70 bg-superficie lg:col-span-2">
          <ul className="divide-y divide-stone-200/70">
            {cats.map((c) => (
              <li key={c.id}>
                <Formulario action={editarCategoria} className={`grid grid-cols-[1fr_auto] items-end gap-3 p-4 sm:grid-cols-[1fr_8rem_auto_auto] ${c.activa ? "" : "opacity-60"}`}>
                  <input type="hidden" name="id" value={c.id} />
                  <label className={ui.label}>
                    <span className="flex justify-between"><span>Nombre</span><span className="font-normal text-stone-400">{conteo.get(c.id) ?? 0} usos</span></span>
                    <input name="nombre" defaultValue={c.nombre} required className={`${ui.input} h-10`} />
                  </label>
                  <label className={`${ui.label} hidden sm:block`}>
                    Tipo
                    <select name="tipo" defaultValue={c.tipo} className={`${ui.input} h-10`}>
                      {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}
                    </select>
                  </label>
                  <label className="flex h-10 items-center gap-2 text-sm">
                    <input type="checkbox" name="activa" defaultChecked={c.activa} className="size-4" /> Activa
                  </label>
                  <Submit variante="btnSec">Guardar</Submit>
                </Formulario>
              </li>
            ))}
          </ul>
        </div>

        <Formulario action={crearCategoria} className={`${ui.card} space-y-4 self-start`}>
          <h2 className={ui.h2}>Nueva categoría</h2>
          <label className={ui.label}>Nombre<input name="nombre" required placeholder="Renta de sillas" className={ui.input} /></label>
          <label className={ui.label}>
            Se usa para
            <select name="tipo" defaultValue="salida" className={ui.input}>
              {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.n}</option>)}
            </select>
          </label>
          <Submit>Agregar</Submit>
        </Formulario>
      </div>
    </>
  );
}
