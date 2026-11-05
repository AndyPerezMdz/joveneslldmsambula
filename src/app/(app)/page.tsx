import Link from "next/link";
import { TarjetaActividad } from "@/components/TarjetaActividad";
import { haceCuanto, hoy, semanasEntre, sumarDias } from "@/lib/fechas";
import { requerirMiembro } from "@/lib/supabase/server";
import { ui } from "@/lib/ui";
import { enEquipo, puedeOrganizar, SEMANAS_ALERTA, type Actividad, type ResumenJoven } from "@/lib/tipos";

export const metadata = { title: "Actividades" };

type Fila = Actividad & { asistencias: { count: number }[] };

export default async function Inicio() {
  const { supabase, perfil } = await requerirMiembro();
  const h = hoy();
  const veLista = enEquipo(perfil, "asistencia");

  const { data } = await supabase
    .from("actividades")
    .select("id, titulo, tipo, fecha, hora, lugar, notas, asistencias(count)")
    .gte("fecha", sumarDias(h, -60))
    .order("fecha")
    .order("hora", { nullsFirst: true });
  const filas = (data ?? []) as Fila[];

  const deHoy = filas.filter((a) => a.fecha === h);
  const proximas = filas.filter((a) => a.fecha > h).slice(0, 12);
  const pasadas = filas.filter((a) => a.fecha < h).reverse().slice(0, 12);

  // A quién hay que buscar (solo equipo de asistencia)
  let perdidos: ResumenJoven[] = [];
  if (veLista) {
    const { data: r } = await supabase.rpc("resumen_jovenes", { p_semanas: 8 });
    perdidos = ((r ?? []) as ResumenJoven[])
      .filter((j) => j.activo && j.ultima && semanasEntre(j.ultima, h) >= SEMANAS_ALERTA)
      .sort((a, b) => (a.ultima! < b.ultima! ? -1 : 1));
  }

  // Para un joven: su propia asistencia
  let mia: { recientes: number; total: number } | null = null;
  if (!veLista) {
    const { data: ficha } = await supabase.from("jovenes").select("id").eq("perfil_id", perfil.id).maybeSingle();
    if (ficha) {
      const { data: r } = await supabase.rpc("resumen_jovenes", { p_semanas: 8 });
      const yo = ((r ?? []) as ResumenJoven[]).find((j) => j.joven_id === ficha.id);
      if (yo) mia = { recientes: yo.recientes, total: yo.total };
    }
  }

  const cuantos = (a: Fila) =>
    veLista ? (
      <span className="shrink-0 text-right leading-tight">
        <span className="block text-lg font-semibold tabular-nums text-titulo">{a.asistencias[0]?.count ?? 0}</span>
        <span className="text-[10px] uppercase tracking-wider text-stone-500">vinieron</span>
      </span>
    ) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">Hola, {perfil.nombre.split(" ")[0]}</p>
          <h1 className={ui.h1}>Actividades</h1>
        </div>
        {puedeOrganizar(perfil) && (
          <Link href="/actividades/nueva" className={ui.btnOro}>+ Nueva actividad</Link>
        )}
      </div>

      {mia && (
        <div className={`${ui.card} flex items-center gap-4`}>
          <span className="titulo text-4xl font-semibold tabular-nums text-titulo">{mia.recientes}</span>
          <p className="text-sm text-stone-500">
            actividades a las que viniste en las últimas 8 semanas ({mia.total} en total).
          </p>
        </div>
      )}

      {deHoy.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-oro">Hoy</h2>
          {deHoy.map((a) => (
            <TarjetaActividad key={a.id} a={a} destacada extra={
              veLista ? <span className={`${ui.btn} h-9 shrink-0 px-3 text-xs`}>Pasar lista</span> : cuantos(a)
            } />
          ))}
        </section>
      )}

      {perdidos.length > 0 && (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-900">Hay que buscarlos</h2>
          <p className="mt-0.5 text-sm text-red-700">Llevan {SEMANAS_ALERTA} semanas o más sin venir.</p>
          <ul className="mt-3 divide-y divide-red-200">
            {perdidos.slice(0, 8).map((j) => (
              <li key={j.joven_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-medium text-red-900">{j.nombre}</span>
                <span className="text-red-700">Vino por última vez {haceCuanto(j.ultima!, h)}</span>
              </li>
            ))}
          </ul>
          {perdidos.length > 8 && (
            <Link href="/jovenes" className="mt-2 inline-block text-sm font-semibold text-red-900 underline">
              Ver los {perdidos.length}
            </Link>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-oro">Próximas</h2>
        {proximas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
            No hay actividades programadas.
            {puedeOrganizar(perfil) && " Crea la primera con “Nueva actividad”."}
          </p>
        ) : (
          proximas.map((a) => <TarjetaActividad key={a.id} a={a} />)
        )}
      </section>

      {pasadas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-oro">Recientes</h2>
          {pasadas.map((a) => <TarjetaActividad key={a.id} a={a} extra={cuantos(a)} />)}
        </section>
      )}
    </div>
  );
}
