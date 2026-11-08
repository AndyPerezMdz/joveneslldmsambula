import Link from "next/link";
import { Album } from "@/components/Album";
import { GraficaSemanas } from "@/components/GraficaSemanas";
import { Encabezado, Indicador, Tarjeta } from "@/components/Tarjeta";
import { TarjetaActividad } from "@/components/TarjetaActividad";
import { pesos } from "@/lib/dinero";
import { driveListo, espacioDrive, fotosDrive, type Foto } from "@/lib/drive";
import { asegurarDias } from "@/lib/calendario";
import { fechaLarga, haceCuanto, horaAhora, hoy, sumarDias } from "@/lib/fechas";
import { asistenciaEntre, lunes } from "@/lib/resumen";
import { requerirMiembro } from "@/lib/supabase/server";
import { enEquipo, esAdmin, hayQueBuscar, puedeOrganizar, SEMANAS_ALERTA, type Actividad, type ResumenJoven } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { IdeaForm } from "./participar/IdeaForm";
import { AvisosPorConfirmar, cargarAvisos } from "./participar/AvisosPorConfirmar";
import { YaPague, type MiAviso } from "./participar/YaPague";

export const metadata = { title: "Inicio" };

type Mia = { id: string; concepto: string; monto: number; fecha_limite: string | null; aportado: number; excluido: boolean };

export default async function Inicio() {
  const { supabase, perfil } = await requerirMiembro();
  const h = hoy();
  const veLista = enEquipo(perfil, "asistencia");
  const veDinero = enEquipo(perfil, "finanzas");

  await asegurarDias(supabase, h, sumarDias(h, 14));
  const [{ data: acts }, { data: mc }, { data: ficha }] = await Promise.all([
    supabase.from("actividades").select("id, titulo, tipo, fecha, hora, hora_fin, lugar, notas, horario_id, cancelada").eq("cancelada", false)
      .gte("fecha", h).lte("fecha", sumarDias(h, 45)).order("fecha").order("hora", { nullsFirst: true }),
    supabase.rpc("mis_cooperaciones"),
    supabase.from("jovenes").select("id").eq("perfil_id", perfil.id).maybeSingle(),
  ]);
  const actividades = (acts ?? []) as Actividad[];
  const deHoy = actividades.filter((a) => a.fecha === h);
  // La que está pasando (empezó hace menos de 2 h o no ha terminado) o la que sigue
  const ahora = horaAhora();
  const aMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const enCurso = deHoy.find((a) => a.hora && aMin(a.hora) <= aMin(ahora) && aMin(ahora) < (a.hora_fin ? aMin(a.hora_fin) : aMin(a.hora) + 60));
  const siguiente = enCurso ?? deHoy.find((a) => a.hora && aMin(a.hora) > aMin(ahora));
  // Las fijas (oraciones, dominical…) ya están en la semana: aquí solo las especiales
  const proximas = actividades.filter((a) => a.fecha > h && !a.horario_id).slice(0, 5);
  const pendientes = ((mc ?? []) as Mia[])
    .filter((c) => !c.excluido && Number(c.aportado) < Number(c.monto))
    .map((c) => ({ ...c, falta: Number(c.monto) - Number(c.aportado) }));

  // ¿Quién puede?: a qué me apunté y dónde todavía hacen falta manos
  type TareaProx = { id: string; nombre: string; cupo: number | null; actividades: { id: string; titulo: string; fecha: string; hora: string | null; cancelada: boolean };
    tarea_voluntarios: { joven_id: string }[] };
  const [{ data: tp }, { data: av }, { data: fin }, { count: ideasNuevas }] = await Promise.all([
    supabase.from("tareas").select("id, nombre, cupo, actividades!inner(id, titulo, fecha, hora, cancelada), tarea_voluntarios(joven_id)")
      .gte("actividades.fecha", h).eq("actividades.cancelada", false),
    ficha ? supabase.from("avisos_pago").select("cooperacion_id, monto, estado, motivo, created_at").eq("joven_id", ficha.id).order("created_at")
      : Promise.resolve({ data: [] }),
    supabase.from("perfiles").select("id, nombre, rol, equipos, lider_de").order("nombre"),
    esAdmin(perfil) ? supabase.from("ideas").select("id", { count: "exact", head: true }).eq("leida", false) : Promise.resolve({ count: 0 }),
  ]);
  const tareasProx = ((tp ?? []) as unknown as TareaProx[]).sort((a, b) => a.actividades.fecha.localeCompare(b.actividades.fecha));
  const misTareas = ficha ? tareasProx.filter((t) => t.tarea_voluntarios.some((v) => v.joven_id === ficha.id)) : [];
  const faltanManos = tareasProx.filter((t) => !misTareas.includes(t) && (t.cupo === null || t.tarea_voluntarios.length < t.cupo));
  const necesitan = [...new Map(faltanManos.map((t) => [t.actividades.id, t.actividades])).values()].slice(0, 4);
  const misAvisos = new Map<string, MiAviso>();
  for (const x of (av ?? []) as MiAviso[]) misAvisos.set(x.cooperacion_id, x);     // se queda el último
  type P = { id: string; nombre: string; rol: string; equipos: string[]; lider_de: string[] };
  const deFinanzas = ((fin ?? []) as P[]).filter((x) => x.equipos?.includes("finanzas") || x.lider_de?.includes("finanzas"));
  const recibe = deFinanzas.length ? deFinanzas : ((fin ?? []) as P[]).filter((x) => x.rol === "admin");
  const avisos = veDinero ? await cargarAvisos(supabase) : [];

  // Asistencia (equipo de asistencia / encargados)
  let resumen: ResumenJoven[] = [];
  let asis: Awaited<ReturnType<typeof asistenciaEntre>> | null = null;
  let repetidos = 0;
  if (veLista) {
    const [{ data: r }, a, { data: rep }] = await Promise.all([
      supabase.rpc("resumen_jovenes", { p_semanas: 8 }),
      asistenciaEntre(supabase, sumarDias(lunes(h), -49), h),
      supabase.rpc("posibles_repetidos"),
    ]);
    resumen = (r ?? []) as ResumenJoven[];
    asis = a;
    repetidos = (rep ?? []).length;
  }
  const activos = resumen.filter((j) => j.activo);
  const perdidos = activos
    .filter(hayQueBuscar)
    .sort((a, b) => b.semanas_falta - a.semanas_falta || (a.ultima! < b.ultima! ? -1 : 1));

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
        {puedeOrganizar(perfil) && <Link href="/actividades/nueva" className={ui.btnOro}>+ Actividad especial</Link>}
      </Encabezado>

      {indicadores.length > 0 && (
        <div className={`escalonado mb-5 grid grid-cols-2 gap-3 ${indicadores.length >= 4 ? "lg:grid-cols-4" : indicadores.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {indicadores.map((k, i) => (
            <div key={k.etiqueta} className={indicadores.length % 2 && i === indicadores.length - 1 ? "col-span-2 lg:col-span-1" : ""}>
              <Indicador {...k} />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="escalonado space-y-5 lg:col-span-2">
          {deHoy.length > 0 && (
            <Tarjeta titulo="Hoy" tono="oro" accion="Semana" href="/actividades">
              <div className="space-y-2">
                {deHoy.map((a) => {
                  const marca = a.id === enCurso?.id ? "Ahora" : a.id === siguiente?.id ? "Sigue" : null;
                  const pasada = !marca && a.hora && aMin(a.hora) < aMin(ahora);
                  return (
                    <div key={a.id} className={`relative ${pasada ? "opacity-60" : ""}`}>
                      {marca && (
                        <span className={`absolute -top-2 left-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${marca === "Ahora" ? "bg-green-700 text-white" : "bg-marca text-white"}`}>
                          {marca}
                        </span>
                      )}
                      <TarjetaActividad a={a} compacta extra={veLista ? <span className={`${ui.btn} h-9 shrink-0 px-3 text-xs`}>Lista</span> : null} />
                    </div>
                  );
                })}
              </div>
            </Tarjeta>
          )}

          <Tarjeta titulo="Próximas actividades especiales" accion="Ver semana" href="/actividades">
            {proximas.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-500">Nada fuera de los horarios fijos en las próximas semanas.</p>
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

        <div className="escalonado space-y-5">
          {pendientes.length > 0 && (
            <Tarjeta titulo="Te falta cooperar" tono="oro">
              <ul className="divide-y divide-oro/30">
                {pendientes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{c.concepto}</span>
                      {c.fecha_limite && <span className="block text-xs text-stone-500">Hasta el {fechaLarga(c.fecha_limite)}</span>}
                      {ficha && <YaPague cooperacion={c.id} falta={c.falta} aviso={misAvisos.get(c.id)} finanzas={recibe} />}
                    </span>
                    <span className="self-start font-semibold tabular-nums text-titulo">{pesos(c.falta)}</span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          <AvisosPorConfirmar avisos={avisos} />

          {misTareas.length > 0 && (
            <Tarjeta titulo="Te apuntaste">
              <ul className="divide-y divide-stone-200/70">
                {misTareas.map((t) => (
                  <li key={t.id}>
                    <Link href={`/apuntarse/${t.actividades.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{t.nombre}</span>
                        <span className="block truncate text-xs text-stone-500">{t.actividades.titulo}</span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-500 first-letter:uppercase">{fechaLarga(t.actividades.fecha).split(",")[0]} {t.actividades.fecha.slice(8)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {necesitan.length > 0 && (
            <Tarjeta titulo="¿Quién puede?" tono="oro">
              <p className="-mt-2 mb-2 text-xs text-titulo/70">Aquí todavía hacen falta manos.</p>
              <ul className="divide-y divide-oro/30">
                {necesitan.map((x) => (
                  <li key={x.id}>
                    <Link href={`/apuntarse/${x.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate font-medium">{x.titulo}</span>
                      <span className="shrink-0 text-xs font-semibold text-oro">Apuntarme →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {esAdmin(perfil) ? (
            <Tarjeta titulo="Buzón de ideas" accion="Abrir" href="/ideas">
              <p className="text-sm text-stone-500">{ideasNuevas ? `${ideasNuevas} sin leer.` : "Nada nuevo."}</p>
            </Tarjeta>
          ) : (
            <Tarjeta titulo="¿Tienes una idea?">
              <IdeaForm />
            </Tarjeta>
          )}

          {repetidos > 0 && (
            <Tarjeta titulo={`Fichas que se parecen (${repetidos})`} tono="oro" accion="Revisar" href="/jovenes#repetidos">
              <p className="text-sm text-titulo/80">
                Puede que alguien esté dos veces en la lista. Júntalas para que su asistencia no se divida.
              </p>
            </Tarjeta>
          )}

          {perdidos.length > 0 && (
            <Tarjeta titulo={`Hay que buscarlos (${perdidos.length})`} tono="alerta">
              <p className="-mt-2 mb-2 text-xs text-red-700">{SEMANAS_ALERTA} semanas o más con culto sin venir</p>
              <ul className="divide-y divide-red-200">
                {perdidos.slice(0, 8).map((j) => (
                  <li key={j.joven_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate font-medium text-red-900">{j.nombre}</span>
                    <span className="shrink-0 text-xs text-red-700">{j.semanas_falta} semanas · {haceCuanto(j.ultima!, h)}</span>
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
