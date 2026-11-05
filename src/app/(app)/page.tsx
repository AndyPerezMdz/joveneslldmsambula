import Link from "next/link";
import { Album } from "@/components/Album";
import { GraficaSemanas } from "@/components/GraficaSemanas";
import { Encabezado, Indicador, Tarjeta } from "@/components/Tarjeta";
import { TarjetaActividad } from "@/components/TarjetaActividad";
import { pesos } from "@/lib/dinero";
import { driveListo, espacioDrive, fotosDrive, type Foto } from "@/lib/drive";
import { fechaLarga, haceCuanto, hoy, semanasEntre, sumarDias } from "@/lib/fechas";
import { asistenciaEntre, lunes } from "@/lib/resumen";
import { requerirMiembro } from "@/lib/supabase/server";
import { enEquipo, puedeOrganizar, SEMANAS_ALERTA, type Actividad, type ResumenJoven } from "@/lib/tipos";
import { ui } from "@/lib/ui";

export const metadata = { title: "Inicio" };

type Mia = { id: string; concepto: string; monto: number; fecha_limite: string | null; aportado: number; excluido: boolean };

export default async function Inicio() {
  const { supabase, perfil } = await requerirMiembro();
  const h = hoy();
  const veLista = enEquipo(perfil, "asistencia");
  const veDinero = enEquipo(perfil, "finanzas");

  const [{ data: acts }, { data: mc }, { data: ficha }] = await Promise.all([
    supabase.from("actividades").select("id, titulo, tipo, fecha, hora, lugar, notas")
      .gte("fecha", h).lte("fecha", sumarDias(h, 45)).order("fecha").order("hora", { nullsFirst: true }),
    supabase.rpc("mis_cooperaciones"),
    supabase.from("jovenes").select("id").eq("perfil_id", perfil.id).maybeSingle(),
  ]);
  const actividades = (acts ?? []) as Actividad[];
  const deHoy = actividades.filter((a) => a.fecha === h);
  const proximas = actividades.filter((a) => a.fecha > h).slice(0, 5);
  const pendientes = ((mc ?? []) as Mia[])
    .filter((c) => !c.excluido && Number(c.aportado) < Number(c.monto))
    .map((c) => ({ ...c, falta: Number(c.monto) - Number(c.aportado) }));

  // Asistencia (equipo de asistencia / encargados)
  let resumen: ResumenJoven[] = [];
  let asis: Awaited<ReturnType<typeof asistenciaEntre>> | null = null;
  if (veLista) {
    const [{ data: r }, a] = await Promise.all([
      supabase.rpc("resumen_jovenes", { p_semanas: 8 }),
      asistenciaEntre(supabase, sumarDias(lunes(h), -49), h),
    ]);
    resumen = (r ?? []) as ResumenJoven[];
    asis = a;
  }
  const activos = resumen.filter((j) => j.activo);
  const perdidos = activos
    .filter((j) => j.ultima && semanasEntre(j.ultima, h) >= SEMANAS_ALERTA)
    .sort((a, b) => (a.ultima! < b.ultima! ? -1 : 1));

  // Mi propia asistencia (joven con cuenta ligada)
  const yo = !veLista && ficha
    ? ((await supabase.rpc("resumen_jovenes", { p_semanas: 8 })).data as ResumenJoven[] | null)?.find((j) => j.joven_id === ficha.id)
    : null;

  // Dinero
  let saldo: number | null = null;
  let coops: { id: string; concepto: string; juntado: number }[] = [];
  if (veDinero) {
    const [{ data: s }, { data: c }, { data: p }] = await Promise.all([
      supabase.rpc("saldo"),
      supabase.from("cooperaciones").select("id, concepto").eq("cerrada", false),
      supabase.from("movimientos").select("cooperacion_id, monto").not("cooperacion_id", "is", null).eq("anulado", false),
    ]);
    saldo = Number(s ?? 0);
    const j = new Map<string, number>();
    for (const x of (p ?? []) as { cooperacion_id: string; monto: number }[]) j.set(x.cooperacion_id, (j.get(x.cooperacion_id) ?? 0) + Number(x.monto));
    coops = ((c ?? []) as { id: string; concepto: string }[]).map((x) => ({ ...x, juntado: j.get(x.id) ?? 0 }));
  }

  // Fotos
  let fotos: Foto[] = [];
  let fotosMes = 0;
  let drive: { usado: number; limite: number | null } | null = null;
  const veFotos = enEquipo(perfil, "evidencias");
  if (driveListo() && veFotos) {
    try {
      const [fs, e] = await Promise.all([fotosDrive(), espacioDrive()]);
      fotos = fs.slice(-6).reverse();
      fotosMes = fs.filter((f) => f.fecha.startsWith(h.slice(0, 7))).length;
      drive = e;
    } catch { /* Drive caído: el inicio sigue */ }
  }

  const indicadores = [
    ...(veLista && asis ? [
      { etiqueta: "Promedio por culto", valor: String(asis.promedioCulto), detalle: "últimas 8 semanas", href: "/actividades" },
      { etiqueta: "Jóvenes activos", valor: String(activos.length), detalle: perdidos.length ? `${perdidos.length} sin venir` : "todos vienen", href: "/jovenes" },
    ] : []),
    ...(veDinero && saldo !== null ? [{ etiqueta: "Saldo", valor: pesos(saldo), detalle: coops.length === 1 ? "1 cooperación abierta" : `${coops.length} cooperaciones abiertas`, href: "/finanzas" }] : []),
    ...(driveListo() && veFotos ? [{ etiqueta: "Fotos este mes", valor: String(fotosMes), href: "/evidencias" }] : []),
    ...(yo ? [{ etiqueta: "Tu asistencia", valor: String(yo.recientes), detalle: "actividades en 8 semanas" }] : []),
    ...(!veDinero && pendientes.length ? [{ etiqueta: "Te falta cooperar", valor: pesos(pendientes.reduce((s, c) => s + c.falta, 0)), color: "text-oro" }] : []),
  ];

  return (
    <>
      <Encabezado titulo={`Hola, ${perfil.nombre.split(" ")[0]}`} sub={<span className="first-letter:uppercase">{fechaLarga(h)}</span>}>
        {puedeOrganizar(perfil) && <Link href="/actividades/nueva" className={ui.btnOro}>+ Nueva actividad</Link>}
      </Encabezado>

      {indicadores.length > 0 && (
        <div className={`mb-5 grid grid-cols-2 gap-3 ${indicadores.length >= 4 ? "lg:grid-cols-4" : indicadores.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {indicadores.map((k, i) => (
            <div key={k.etiqueta} className={indicadores.length % 2 && i === indicadores.length - 1 ? "col-span-2 lg:col-span-1" : ""}>
              <Indicador {...k} />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {deHoy.length > 0 && (
            <Tarjeta titulo="Hoy" tono="oro">
              <div className="space-y-2">
                {deHoy.map((a) => (
                  <TarjetaActividad key={a.id} a={a} extra={veLista ? <span className={`${ui.btn} h-9 shrink-0 px-3 text-xs`}>Pasar lista</span> : null} />
                ))}
              </div>
            </Tarjeta>
          )}

          <Tarjeta titulo="Próximas actividades" accion="Ver todas" href="/actividades">
            {proximas.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-500">No hay actividades en las próximas semanas.</p>
            ) : (
              <div className="space-y-2">{proximas.map((a) => <TarjetaActividad key={a.id} a={a} />)}</div>
            )}
          </Tarjeta>

          {asis && (
            <Tarjeta titulo="Jóvenes que vinieron, por semana" accion="Reporte" href="/reportes">
              <GraficaSemanas semanas={asis.semanas} serie={asis.serie} />
            </Tarjeta>
          )}
        </div>

        <div className="space-y-5">
          {pendientes.length > 0 && (
            <Tarjeta titulo="Te falta cooperar" tono="oro">
              <ul className="divide-y divide-oro/30">
                {pendientes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="font-medium">{c.concepto}</span>
                      {c.fecha_limite && <span className="block text-xs text-stone-500">Hasta el {fechaLarga(c.fecha_limite)}</span>}
                    </span>
                    <span className="font-semibold tabular-nums text-titulo">{pesos(c.falta)}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {perdidos.length > 0 && (
            <Tarjeta titulo={`Hay que buscarlos (${perdidos.length})`} tono="alerta">
              <p className="-mt-2 mb-2 text-xs text-red-700">{SEMANAS_ALERTA} semanas o más sin venir</p>
              <ul className="divide-y divide-red-200">
                {perdidos.slice(0, 8).map((j) => (
                  <li key={j.joven_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate font-medium text-red-900">{j.nombre}</span>
                    <span className="shrink-0 text-xs text-red-700">{haceCuanto(j.ultima!, h)}</span>
                  </li>
                ))}
              </ul>
              {perdidos.length > 8 && <Link href="/jovenes" className="mt-2 inline-block text-xs font-semibold text-red-900 underline">Ver los {perdidos.length}</Link>}
            </Tarjeta>
          )}

          {coops.length > 0 && (
            <Tarjeta titulo="Cooperaciones abiertas" accion="Ver" href="/finanzas/cooperaciones">
              <ul className="divide-y divide-stone-200/70">
                {coops.map((c) => (
                  <li key={c.id}>
                    <Link href={`/finanzas/cooperaciones/${c.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate">{c.concepto}</span>
                      <span className="shrink-0 tabular-nums text-green-700">{pesos(c.juntado)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {fotos.length > 0 && (
            <Tarjeta titulo="Últimas fotos" accion="Evidencias" href="/evidencias">
              <Album fotos={fotos} />
            </Tarjeta>
          )}

          {drive?.limite && drive.usado / drive.limite >= 0.75 && (
            <Link href="/evidencias" className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              El Drive va en {Math.round((drive.usado / drive.limite) * 100)} %. Hay que hacer limpieza de fotos.
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
