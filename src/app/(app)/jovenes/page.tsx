import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { IcSubir } from "@/components/Iconos";
import { Submit } from "@/components/Submit";
import { Encabezado, Indicador } from "@/components/Tarjeta";
import { haceCuanto, hoy, semanasEntre } from "@/lib/fechas";
import { normalizar } from "@/lib/nombres";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, SEMANAS_ALERTA, type ResumenJoven } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { actualizarJoven, borrarJoven, crearJoven, fusionarJoven } from "./actions";

export const metadata = { title: "Jóvenes" };

type Ficha = { id: string; email: string | null; telefono: string | null; perfil_id: string | null };

export default async function Jovenes({ searchParams }: { searchParams: Promise<{ q?: string; ver?: string }> }) {
  const { supabase } = await requerir((p) => enEquipo(p, "asistencia"));
  const { q = "", ver = "activos" } = await searchParams;
  const h = hoy();

  const [{ data: r }, { data: f }] = await Promise.all([
    supabase.rpc("resumen_jovenes", { p_semanas: 8 }),
    supabase.from("jovenes").select("id, email, telefono, perfil_id"),
  ]);
  const fichas = new Map(((f ?? []) as Ficha[]).map((x) => [x.id, x]));
  const todos = ((r ?? []) as ResumenJoven[]).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const activos = todos.filter((j) => j.activo);
  const sinVenir = activos.filter((j) => j.ultima && semanasEntre(j.ultima, h) >= SEMANAS_ALERTA);
  const conCuenta = todos.filter((j) => fichas.get(j.joven_id)?.perfil_id).length;

  const base = ver === "inactivos" ? todos.filter((j) => !j.activo) : ver === "sin-venir" ? sinVenir : activos;
  const lista = q ? base.filter((j) => normalizar(j.nombre).includes(normalizar(q))) : base;

  const filtros = [
    { v: "activos", n: `Activos (${activos.length})` },
    { v: "sin-venir", n: `Sin venir (${sinVenir.length})` },
    { v: "inactivos", n: `Inactivos (${todos.length - activos.length})` },
  ];

  return (
    <>
      <Encabezado titulo="Jóvenes" sub="Asistencia de las últimas 8 semanas">
        <Link href="/jovenes/importar" className={ui.btnSec}><IcSubir className="size-4" /> Importar lista</Link>
      </Encabezado>

      <div className="escalonado mb-5 grid grid-cols-3 gap-3">
        <Indicador etiqueta="Activos" valor={String(activos.length)} />
        <Indicador etiqueta="Sin venir" valor={String(sinVenir.length)} color={sinVenir.length ? "text-red-700" : "text-titulo"} detalle={`${SEMANAS_ALERTA}+ semanas`} />
        <Indicador etiqueta="Con cuenta" valor={String(conCuenta)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-stone-200 bg-superficie p-1 text-sm">
              {filtros.map((t) => (
                <Link key={t.v} href={`/jovenes?ver=${t.v}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className={`rounded-lg px-3 py-1.5 font-medium transition ${ver === t.v ? "bg-marca text-white" : "text-stone-500 hover:text-titulo"}`}>
                  {t.n}
                </Link>
              ))}
            </div>
            <form className="min-w-40 flex-1">
              <input type="hidden" name="ver" value={ver} />
              <input name="q" type="search" defaultValue={q} placeholder="Buscar nombre…" aria-label="Buscar" className={`${ui.input} mt-0 h-10`} />
            </form>
          </div>

          <div className="overflow-hidden rounded-3xl border border-stone-200/70 bg-superficie">
            <div className="hidden grid-cols-[1fr_9rem_5rem_4rem] gap-3 border-b border-stone-200/70 bg-stone-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500 sm:grid">
              <span>Nombre</span><span>Última vez</span><span className="text-right">8 sem.</span><span className="text-right">Total</span>
            </div>
            {lista.length === 0 && <p className="p-8 text-center text-sm text-stone-500">Nadie por aquí.</p>}
            <ul className="divide-y divide-stone-200/70">
              {lista.map((j) => {
                const x = fichas.get(j.joven_id);
                const semanas = j.ultima ? semanasEntre(j.ultima, h) : null;
                const alerta = j.activo && semanas !== null && semanas >= SEMANAS_ALERTA;
                return (
                  <li key={j.joven_id}>
                    <details className="group">
                      <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-stone-50 sm:grid-cols-[1fr_9rem_5rem_4rem]">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {j.nombre}
                            {x?.perfil_id && <span className="ml-2 rounded-full bg-marca-claro px-2 py-0.5 text-[10px] font-semibold text-titulo">cuenta</span>}
                          </span>
                          <span className={`text-xs sm:hidden ${alerta ? "font-medium text-red-600" : "text-stone-500"}`}>
                            {j.ultima ? haceCuanto(j.ultima, h) : "Nunca ha venido"}
                          </span>
                        </span>
                        <span className={`hidden text-sm sm:block ${alerta ? "font-medium text-red-600" : "text-stone-500"}`}>
                          {j.ultima ? haceCuanto(j.ultima, h) : "Nunca"}
                        </span>
                        <span className="text-right font-semibold tabular-nums text-titulo">{j.recientes}</span>
                        <span className="hidden text-right tabular-nums text-stone-500 sm:block">{j.total}</span>
                      </summary>
                      <div className="border-t border-stone-200/70 bg-stone-50/60 p-4">
                        <Formulario action={actualizarJoven} className="space-y-4">
                          <input type="hidden" name="id" value={j.joven_id} />
                          <div className="grid gap-4 sm:grid-cols-3">
                            <label className={ui.label}>Nombre<input name="nombre" required defaultValue={j.nombre} className={ui.input} /></label>
                            <label className={ui.label}>Correo<input name="email" type="email" defaultValue={x?.email ?? ""} className={ui.input} /></label>
                            <label className={ui.label}>Teléfono<input name="telefono" type="tel" defaultValue={x?.telefono ?? ""} className={ui.input} /></label>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" name="activo" defaultChecked={j.activo} className="size-4" />
                              Activo (sale en el pase de lista)
                            </label>
                            <Submit>Guardar</Submit>
                          </div>
                        </Formulario>
                        <Formulario action={fusionarJoven} className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-200/70 pt-4">
                          <input type="hidden" name="id" value={j.joven_id} />
                          <label className={`${ui.label} min-w-48 flex-1`}>
                            ¿Está repetido? Juntar con…
                            <select name="origen" required defaultValue="" className={`${ui.input} h-10`}>
                              <option value="" disabled>Elige la otra ficha</option>
                              {todos.filter((o) => o.joven_id !== j.joven_id).map((o) => (
                                <option key={o.joven_id} value={o.joven_id}>{o.nombre}{fichas.get(o.joven_id)?.perfil_id ? " (con cuenta)" : ""}</option>
                              ))}
                            </select>
                          </label>
                          <Submit variante="btnSec" confirmar={`¿Juntar esa ficha con ${j.nombre}? Se queda este nombre, con la asistencia y los pagos de las dos. La otra ficha desaparece.`}>
                            Juntar
                          </Submit>
                        </Formulario>
                        <Formulario action={borrarJoven} className="mt-3 flex justify-end">
                          <input type="hidden" name="id" value={j.joven_id} />
                          <Submit variante="btnMini" confirmar={`¿Borrar a ${j.nombre}? Se borra también toda su asistencia. Si solo dejó de venir, mejor márcalo como inactivo.`}>
                            Borrar
                          </Submit>
                        </Formulario>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div>
          <Formulario action={crearJoven} className={`${ui.card} space-y-4 lg:sticky lg:top-8`}>
            <h2 className={ui.h2}>Agregar uno</h2>
            <label className={ui.label}>Nombre completo<input name="nombre" required className={ui.input} /></label>
            <label className={ui.label}>Correo <span className="font-normal text-stone-400">(opcional)</span>
              <input name="email" type="email" className={ui.input} /></label>
            <label className={ui.label}>Teléfono <span className="font-normal text-stone-400">(opcional)</span>
              <input name="telefono" type="tel" className={ui.input} /></label>
            <p className="text-xs text-stone-500">Con su correo, si algún día crea cuenta, se liga solo.</p>
            <Submit>Agregar</Submit>
          </Formulario>
        </div>
      </div>
    </>
  );
}
