import Link from "next/link";
import { Encabezado } from "@/components/Tarjeta";
import { TarjetaActividad } from "@/components/TarjetaActividad";
import { asegurarDias } from "@/lib/calendario";
import { horaBonita, hoy, nombreMes, partesFecha, sumarDias } from "@/lib/fechas";
import { lunes } from "@/lib/resumen";
import { requerirMiembro } from "@/lib/supabase/server";
import { ENLACE_SUBIR_FOTOS } from "@/lib/drive";
import { DIAS_LISTA, enEquipo, esAdmin, esEncargado, esLider, tipo, type Actividad } from "@/lib/tipos";
import { ui } from "@/lib/ui";

export const metadata = { title: "Actividades" };

type Fila = Actividad & { asistencias: { count: number }[] };
const SELECT = "id, titulo, tipo, fecha, hora, hora_fin, lugar, notas, horario_id, cancelada, asistencias(count)";

export default async function Actividades({ searchParams }: { searchParams: Promise<{ ver?: string; sem?: string; dia?: string }> }) {
  const { supabase, perfil } = await requerirMiembro();
  const { ver = "semana", sem, dia } = await searchParams;
  const h = hoy();
  const veLista = enEquipo(perfil, "asistencia");

  // Fuera del admin nadie organiza: cada quien ve lo del día y hace lo suyo
  if (!esAdmin(perfil)) {
    const listaTodo = esEncargado(perfil) || esLider(perfil, "asistencia");
    const desde = veLista ? sumarDias(h, listaTodo ? -14 : -DIAS_LISTA) : h;
    await asegurarDias(supabase, h, h);
    const { data } = await supabase.from("actividades").select(SELECT).eq("cancelada", false)
      .gte("fecha", desde).lte("fecha", h).order("fecha", { ascending: false }).order("hora", { nullsFirst: true });
    const filas = (data ?? []) as Fila[];
    const deHoy = filas.filter((a) => a.fecha === h);
    const antes = filas.filter((a) => a.fecha < h);
    const veFotos = enEquipo(perfil, "evidencias");
    const fila = (a: Fila) => (
      <TarjetaActividad key={a.id} a={a} compacta={a.fecha === h} destacada={a.fecha === h} extra={veLista ? (
        <span className="shrink-0 text-right leading-tight">
          <span className="block text-lg font-semibold tabular-nums text-titulo">{a.asistencias[0]?.count ?? 0}</span>
          <span className="text-[10px] uppercase tracking-wider text-stone-500">vinieron</span>
        </span>
      ) : null} />
    );
    const que = [veLista && "pasa lista", enEquipo(perfil, "finanzas") && "registra el dinero", veFotos && "sube las fotos"].filter(Boolean) as string[];
    return (
      <>
        <Encabezado titulo="Actividades de hoy"
          sub={que.length ? `Entra a la actividad y ${que.join(", ").replace(/, ([^,]*)$/, " y $1")}.` : "Lo que hay hoy en el templo."}>
          {veFotos && <a href={ENLACE_SUBIR_FOTOS} target="_blank" rel="noopener noreferrer" className={ui.btnOro}>Subir fotos al Drive</a>}
        </Encabezado>
        <section className="escalonado space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-oro first-letter:uppercase">
            {partesFecha(h).semana} {partesFecha(h).dia} {partesFecha(h).mes}
          </h2>
          {deHoy.length ? deHoy.map(fila) : (
            <p className="rounded-3xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">Hoy no hay actividades.</p>
          )}
        </section>
        {antes.length > 0 && (
          <section className="mt-8 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-oro">Días anteriores · la lista sigue abierta</h2>
            <p className={ui.ayuda}>
              {listaTodo ? "Como encargado puedes corregir cualquier lista; aquí están las de las últimas dos semanas."
                : `Si algo quedó mal, todavía se corrige ${DIAS_LISTA} días después. Luego solo el encargado.`}
            </p>
            <div className="grid gap-2 lg:grid-cols-2">{antes.map(fila)}</div>
          </section>
        )}
      </>
    );
  }

  const pestañas = [
    { v: "semana", n: "Semana" },
    { v: "proximas", n: "Próximas" },
    { v: "pasadas", n: "Pasadas" },
  ];
  const barra = (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl border border-stone-200 bg-superficie p-1 text-sm">
        {pestañas.map((t) => (
          <Link key={t.v} href={t.v === "semana" ? "/actividades" : `/actividades?ver=${t.v}`}
            className={`rounded-lg px-4 py-1.5 font-medium transition ${ver === t.v ? "bg-marca text-white" : "text-stone-500 hover:text-titulo"}`}>
            {t.n}
          </Link>
        ))}
      </div>
    </div>
  );
  const botones = (
    <>
      <Link href="/actividades/horarios" className={ui.btnSec}>Horarios fijos</Link>
      <Link href="/actividades/importar" className={ui.btnSec}>Importar</Link>
      <Link href="/actividades/nueva" className={ui.btnOro}>+ Actividad especial</Link>
    </>
  );

  // ---------- Semana ----------
  if (ver === "semana") {
    const ini = sem && /^\d{4}-\d{2}-\d{2}$/.test(sem) ? lunes(sem) : lunes(h);
    const fin = sumarDias(ini, 6);
    await asegurarDias(supabase, ini < h ? h : ini, fin < h ? h : fin);
    const { data } = await supabase.from("actividades").select(SELECT).eq("cancelada", false)
      .gte("fecha", ini).lte("fecha", fin).order("fecha").order("hora", { nullsFirst: true });
    const filas = (data ?? []) as Fila[];
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(ini, i));
    const porDia = new Map(dias.map((d) => [d, filas.filter((a) => a.fecha === d)]));
    // En el celular se ve un día: el elegido, o hoy si cae en esta semana
    const diaCel = dia && dias.includes(dia) ? dia : dias.includes(h) ? h : ini;

    return (
      <>
        <Encabezado titulo="Actividades" sub="Los horarios fijos aparecen solos cada día.">{botones}</Encabezado>
        {barra}
        <div className="mb-4 flex items-center gap-1">
          <Link href={`/actividades?sem=${sumarDias(ini, -7)}`} className={ui.btnMini} aria-label="Semana anterior">‹</Link>
          <span className="min-w-52 text-center font-semibold text-titulo first-letter:uppercase">
            {partesFecha(ini).dia} {partesFecha(ini).mes} – {partesFecha(fin).dia} {partesFecha(fin).mes} · {nombreMes(fin.slice(0, 7)).split(" ").pop()}
          </span>
          <Link href={`/actividades?sem=${sumarDias(ini, 7)}`} className={ui.btnMini} aria-label="Semana siguiente">›</Link>
          {ini !== lunes(h) && <Link href="/actividades" className={`${ui.btnMini} ml-2`}>Hoy</Link>}
        </div>

        {/* Celular: un día a la vez */}
        <div className="mb-3 grid grid-cols-7 gap-1 lg:hidden">
          {dias.map((d) => {
            const f = partesFecha(d);
            const on = d === diaCel;
            return (
              <Link key={d} href={`/actividades?sem=${ini}&dia=${d}`}
                className={`flex flex-col items-center rounded-xl py-1.5 text-xs ${on ? "bg-marca text-white" : d === h ? "bg-oro-suave text-titulo" : "text-stone-500"}`}>
                <span className="font-semibold uppercase">{f.semana.slice(0, 2)}</span>
                <span className="text-base font-semibold tabular-nums">{f.dia}</span>
              </Link>
            );
          })}
        </div>

        <div className="escalonado grid gap-3 lg:grid-cols-7">
          {dias.map((d) => {
            const f = partesFecha(d);
            const esHoy = d === h;
            const lista = porDia.get(d)!;
            return (
              <section key={d} id={esHoy ? "hoy" : undefined}
                className={`${d === diaCel ? "" : "hidden lg:block"} rounded-2xl border p-2.5 ${esHoy ? "border-oro bg-oro-suave ring-2 ring-oro/20" : d < h ? "border-stone-200/70 bg-superficie/60" : "border-stone-200/70 bg-superficie"}`}>
                <h2 className="mb-2 flex items-baseline gap-1.5 px-1 lg:flex-col lg:items-start lg:gap-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{f.semana}{esHoy && " · hoy"}</span>
                  <span className="titulo text-xl font-semibold text-titulo">{f.dia}</span>
                </h2>
                {lista.length === 0 ? (
                  <p className="px-1 pb-1 text-xs text-stone-400">Nada</p>
                ) : (
                  <ul className="space-y-1.5">
                    {lista.map((a) => {
                      const t = tipo(a.tipo);
                      const n = a.asistencias[0]?.count ?? 0;
                      return (
                        <li key={a.id}>
                          <Link href={`/actividades/${a.id}`}
                            className="chip block rounded-xl px-2.5 py-2 transition hover:-translate-y-px" style={{ ["--c" as string]: t.color }}>
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="text-[11px] font-semibold tabular-nums text-stone-500">{horaBonita(a.hora) ?? "Todo el día"}</span>
                              {veLista && d <= h && <span className={`text-[11px] font-bold tabular-nums ${n ? "text-green-700" : "text-stone-400"}`}>{n} ✓</span>}
                            </span>
                            <span className="chip-texto block text-[13px] font-semibold leading-tight">{a.titulo}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </>
    );
  }

  // ---------- Próximas / pasadas ----------
  const pasadas = ver === "pasadas";
  if (!pasadas) await asegurarDias(supabase, h, sumarDias(h, 14));
  let q = supabase.from("actividades").select(SELECT).eq("cancelada", false);
  q = pasadas ? q.lt("fecha", h).order("fecha", { ascending: false }).limit(150) : q.gte("fecha", h).order("fecha").limit(150);
  const { data } = await q.order("hora", { ascending: !pasadas, nullsFirst: true });
  const filas = (data ?? []) as Fila[];
  const porDia = new Map<string, Fila[]>();
  for (const a of filas) porDia.set(a.fecha, [...(porDia.get(a.fecha) ?? []), a]);

  return (
    <>
      <Encabezado titulo="Actividades">{botones}</Encabezado>
      {barra}
      {filas.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500">
          {pasadas ? "Todavía no hay actividades pasadas." : "No hay actividades programadas."}
        </p>
      ) : (
        <div className="grid gap-x-6 gap-y-6 lg:grid-cols-2">
          {[...porDia.entries()].map(([dia, lista]) => (
            <section key={dia} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-oro">
                {dia === h ? "Hoy" : `${partesFecha(dia).semana} ${partesFecha(dia).dia} ${partesFecha(dia).mes}`}
              </h2>
              {lista.map((a) => (
                <TarjetaActividad key={a.id} a={a} destacada={a.fecha === h} extra={veLista && a.fecha <= h ? (
                  <span className="shrink-0 text-right leading-tight">
                    <span className="block text-lg font-semibold tabular-nums text-titulo">{a.asistencias[0]?.count ?? 0}</span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500">vinieron</span>
                  </span>
                ) : null} />
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
