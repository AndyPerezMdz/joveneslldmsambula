import { Formulario } from "@/components/Formulario";
import { IcEvidencias, IcFinanzas, IcJovenes } from "@/components/Iconos";
import { Submit } from "@/components/Submit";
import { Encabezado } from "@/components/Tarjeta";
import { requerir } from "@/lib/supabase/server";
import { esAdmin, esLider, veEquipo, type Equipo as TipoEquipo, type Perfil } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { agregarAGrupo, cambiarLider, cambiarRol, quitarDeGrupo } from "./actions";

export const metadata = { title: "Equipo" };

type Cuenta = Perfil & { email: string | null };

const GRUPOS: { v: TipoEquipo; n: string; d: string; Icono: (p: { className?: string }) => React.JSX.Element }[] = [
  { v: "asistencia", n: "Asistencia", d: "Pasan lista y llevan la lista de jóvenes.", Icono: IcJovenes },
  { v: "finanzas", n: "Finanzas", d: "Entradas, salidas, cooperaciones y tickets.", Icono: IcFinanzas },
  { v: "evidencias", n: "Evidencias", d: "Suben las fotos de cada actividad a Drive.", Icono: IcEvidencias },
];

const inicial = (n: string) => n.trim().charAt(0).toUpperCase() || "?";

function Persona({ c, etiqueta, children }: { c: Cuenta; etiqueta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-claro text-sm font-bold text-titulo">{inicial(c.nombre)}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug">{c.nombre}</span>
        {etiqueta && <span className="block truncate">{etiqueta}</span>}
        {children && <span className="-ml-2.5 mt-0.5 flex flex-wrap items-center">{children}</span>}
      </span>
    </li>
  );
}

export default async function Equipo() {
  const { supabase, perfil: yo } = await requerir(veEquipo);
  const admin = esAdmin(yo);
  const { data } = await supabase.from("perfiles").select("id, nombre, email, rol, equipos, lider_de").order("nombre");
  const cuentas = (data ?? []) as Cuenta[];
  const misGrupos = GRUPOS.filter((g) => esLider(yo, g.v));
  const direccion = cuentas.filter((c) => c.rol !== "joven");

  return (
    <>
      <Encabezado titulo="Equipo"
        sub={admin
          ? "Cada grupo con su encargado y sus miembros. El encargado de un grupo puede agregar y quitar gente de ese grupo."
          : "Agrega o quita miembros de tu grupo. Solo salen quienes ya crearon su cuenta."} />

      {/* ---- Grupos ---- */}
      <div className="grid items-start gap-5 lg:grid-cols-3 escalonado">
        {misGrupos.map((g) => {
          const lideres = cuentas.filter((c) => c.lider_de.includes(g.v));
          const miembros = cuentas.filter((c) => c.equipos.includes(g.v) && !c.lider_de.includes(g.v));
          const disponibles = cuentas.filter((c) => c.rol !== "admin" && !c.equipos.includes(g.v) && !c.lider_de.includes(g.v));
          return (
            <section key={g.v} className="flex flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-superficie shadow-[0_1px_2px_rgb(23_32_44/0.04)]">
              <header className="flex items-start gap-3 border-b border-stone-200/70 bg-gradient-to-b from-marca-claro/70 to-transparent p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-marca text-oro-claro"><g.Icono className="size-5" /></span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <h2 className="titulo text-xl font-semibold text-titulo">{g.n}</h2>
                    <span className="text-xs tabular-nums text-stone-500">{lideres.length + miembros.length}</span>
                  </span>
                  <span className="block text-xs text-stone-500">{g.d}</span>
                </span>
              </header>

              <div className="flex-1 space-y-4 p-5">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-oro">Encargado</h3>
                  {lideres.length === 0 ? (
                    <p className="mt-1 text-sm text-stone-500">{admin ? "Sin encargado. Nómbralo de entre los miembros." : "—"}</p>
                  ) : (
                    <ul className="divide-y divide-stone-200/70">
                      {lideres.map((c) => (
                        <Persona key={c.id} c={c} etiqueta={<span className="text-xs text-stone-500">{c.id === yo.id ? "Tú" : c.email}</span>}>
                          {admin && (
                            <Formulario action={cambiarLider}>
                              <input type="hidden" name="perfil" value={c.id} />
                              <input type="hidden" name="equipo" value={g.v} />
                              <input type="hidden" name="lider" value="false" />
                              <Submit variante="btnMini" confirmar={`¿Quitar a ${c.nombre} como encargado de ${g.n}? Sigue como miembro del grupo.`}>Quitar cargo</Submit>
                            </Formulario>
                          )}
                        </Persona>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Miembros</h3>
                  {miembros.length === 0 ? (
                    <p className="mt-1 text-sm text-stone-500">Todavía nadie.</p>
                  ) : (
                    <ul className="divide-y divide-stone-200/70">
                      {miembros.map((c) => (
                        <Persona key={c.id} c={c}>
                          {admin && (
                            <Formulario action={cambiarLider} silencioso>
                              <input type="hidden" name="perfil" value={c.id} />
                              <input type="hidden" name="equipo" value={g.v} />
                              <input type="hidden" name="lider" value="true" />
                              <Submit variante="btnMini">Hacer encargado</Submit>
                            </Formulario>
                          )}
                          <Formulario action={quitarDeGrupo}>
                            <input type="hidden" name="perfil" value={c.id} />
                            <input type="hidden" name="equipo" value={g.v} />
                            <Submit variante="btnMini" confirmar={`¿Quitar a ${c.nombre} de ${g.n}? Deja de ver lo de este grupo.`}>Quitar</Submit>
                          </Formulario>
                        </Persona>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <Formulario action={agregarAGrupo} className="flex items-end gap-2 border-t border-stone-200/70 bg-stone-50/60 p-4">
                <input type="hidden" name="equipo" value={g.v} />
                <label className={`${ui.label} min-w-0 flex-1`}>
                  Agregar a {g.n}
                  <select name="perfil" required defaultValue="" className={`${ui.input} h-10`} disabled={disponibles.length === 0}>
                    <option value="" disabled>{disponibles.length ? "Elige a alguien…" : "Ya están todos"}</option>
                    {disponibles.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </label>
                <Submit>Agregar</Submit>
              </Formulario>
            </section>
          );
        })}
      </div>

      {/* ---- Dirección (solo admin) ---- */}
      {admin && (
        <section className="mt-8 grid items-start gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="titulo mb-1 text-xl font-semibold text-titulo">Dirección</h2>
            <p className="mb-3 text-sm text-stone-500">
              <b>Admins</b>: ven todo y manejan esta pantalla. <b>Encargados generales</b>: asistencia, actividades,
              horarios y reportes (no ven dinero ni fotos si no están en esos grupos).
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {direccion.map((c) => (
                <li key={c.id} className="rounded-2xl border border-stone-200/70 bg-superficie p-4">
                  <Formulario action={cambiarRol} className="space-y-3">
                    <input type="hidden" name="perfil" value={c.id} />
                    <div className="flex items-center gap-3">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${c.rol === "admin" ? "bg-marca text-oro-claro" : "bg-oro-suave text-titulo"}`}>{inicial(c.nombre)}</span>
                      <span className="min-w-0 flex-1">
                        <input name="nombre" defaultValue={c.nombre} aria-label="Nombre" className="w-full truncate rounded-lg bg-transparent px-1 text-sm font-medium outline-none focus:bg-stone-50 focus:ring-2 focus:ring-oro/30" />
                        <span className="block truncate px-1 text-xs text-stone-500">{c.id === yo.id ? "Tú · " : ""}{c.email}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select name="rol" defaultValue={c.rol} className={`${ui.input} mt-0 h-11 flex-1 text-sm`} aria-label="Rol">
                        <option value="admin">Admin</option>
                        <option value="encargado">Encargado general</option>
                        <option value="joven">Sin cargo</option>
                      </select>
                      <Submit variante="btnSec">Guardar</Submit>
                    </div>
                  </Formulario>
                </li>
              ))}
            </ul>
          </div>

          <Formulario action={cambiarRol} className={`${ui.card} space-y-4 lg:mt-14`}>
            <h3 className={ui.h2}>Dar un cargo</h3>
            <label className={ui.label}>
              ¿Quién?
              <select name="perfil" required defaultValue="" className={ui.input}>
                <option value="" disabled>Elige a alguien…</option>
                {cuentas.filter((c) => c.rol === "joven").map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label className={ui.label}>
              Cargo
              <select name="rol" defaultValue="encargado" className={ui.input}>
                <option value="encargado">Encargado general</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <Submit>Dar cargo</Submit>
          </Formulario>
        </section>
      )}
    </>
  );
}
