import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { Encabezado } from "@/components/Tarjeta";
import { pesos } from "@/lib/dinero";
import { fechaLarga, hoy } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, esAdmin } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { deshacerCorte, hacerCorte } from "../actions";

export const metadata = { title: "Cortes de caja" };

type Corte = {
  id: string; hasta: string; entradas: number; salidas: number; saldo: number;
  notas: string | null; created_at: string; perfiles: { nombre: string } | null;
};

export default async function Cortes() {
  const { supabase, perfil } = await requerir((p) => enEquipo(p, "finanzas"));
  const h = hoy();
  const [{ data }, { data: saldo }] = await Promise.all([
    supabase.from("cortes").select("id, hasta, entradas, salidas, saldo, notas, created_at, perfiles(nombre)").order("hasta", { ascending: false }),
    supabase.rpc("saldo"),
  ]);
  const cortes = (data ?? []) as unknown as Corte[];
  const ultimo = cortes[0];

  return (
    <>
      <Link href="/finanzas" className="text-sm text-stone-500 hover:text-titulo">← Finanzas</Link>
      <div className="mt-2">
        <Encabezado titulo="Cortes de caja" sub="Al hacer un corte, todo lo de esa fecha para atrás queda cerrado: ya no se registra ni se anula nada ahí." />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {cortes.length === 0 && (
            <p className="rounded-3xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
              Todavía no hay cortes. El primero cierra todo lo que se ha registrado hasta esa fecha.
            </p>
          )}
          {cortes.map((c, i) => (
            <div key={c.id} className={`${ui.card} space-y-3 p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold text-titulo first-letter:uppercase">Al {fechaLarga(c.hasta)}</h2>
                <span className="text-xs text-stone-500">
                  Lo hizo {c.perfiles?.nombre ?? "(cuenta borrada)"} · {new Date(c.created_at).toLocaleDateString("es-MX", { timeZone: "America/Merida" })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-green-50 p-2"><p className="text-[11px] text-green-800">Entró</p><p className="font-semibold tabular-nums text-green-700">{pesos(Number(c.entradas))}</p></div>
                <div className="rounded-xl bg-red-50 p-2"><p className="text-[11px] text-red-700">Salió</p><p className="font-semibold tabular-nums text-red-700">{pesos(Number(c.salidas))}</p></div>
                <div className="rounded-xl bg-marca-claro p-2"><p className="text-[11px] text-titulo">Saldo al cierre</p><p className="font-semibold tabular-nums text-titulo">{pesos(Number(c.saldo))}</p></div>
              </div>
              {c.notas && <p className="whitespace-pre-line text-sm text-stone-600">{c.notas}</p>}
              {i === 0 && esAdmin(perfil) && (
                <Formulario action={deshacerCorte} className="flex justify-end">
                  <input type="hidden" name="id" value={c.id} />
                  <Submit variante="btnMini" confirmar="¿Deshacer este corte? El periodo se vuelve a abrir: se podrá registrar y anular con esas fechas.">
                    Deshacer corte
                  </Submit>
                </Formulario>
              )}
            </div>
          ))}
        </div>

        <Formulario action={hacerCorte} className={`${ui.card} space-y-4 lg:sticky lg:top-8`}>
          <h2 className={ui.h2}>Hacer corte</h2>
          <p className="text-sm text-stone-500">Saldo de hoy: <b className="tabular-nums text-titulo">{pesos(Number(saldo ?? 0))}</b></p>
          <label className={ui.label}>
            Hasta el día
            <input name="hasta" type="date" required defaultValue={h} max={h} min={ultimo?.hasta} className={ui.input} />
          </label>
          <label className={ui.label}>
            Notas <span className="font-normal text-stone-400">(opcional)</span>
            <textarea name="notas" rows={3} placeholder="Ej. Corte de noviembre. Contado en efectivo con …" className={ui.input} />
          </label>
          <p className="text-xs text-stone-500">Si cortas al día de hoy, lo que falte de hoy ya no se podrá registrar con esta fecha.</p>
          <Submit confirmar="¿Hacer el corte? Todo lo de esa fecha para atrás queda cerrado. Solo un admin lo puede deshacer.">Hacer corte</Submit>
        </Formulario>
      </div>
    </>
  );
}
