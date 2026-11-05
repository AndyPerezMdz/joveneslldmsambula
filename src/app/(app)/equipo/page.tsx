import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { Encabezado } from "@/components/Tarjeta";
import { requerir } from "@/lib/supabase/server";
import { EQUIPOS, esAdmin, type Equipo as TipoEquipo, type Perfil, type RolApp } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { actualizarCuenta, agregarAlEquipo, quitarDelEquipo } from "./actions";

export const metadata = { title: "Equipo" };

type Cuenta = Perfil & { email: string | null };

const ROLES_EQUIPO: { v: RolApp; n: string; d: string }[] = [
  { v: "joven", n: "Miembro de equipo", d: "Solo lo de sus equipos" },
  { v: "encargado", n: "Encargado", d: "Asistencia, actividades y reportes" },
  { v: "admin", n: "Admin", d: "Todo, incluida esta pantalla" },
];

function CamposRol({ rol = "joven", equipos = [] }: { rol?: RolApp; equipos?: TipoEquipo[] }) {
  return (
    <>
      <label className={ui.label}>
        Rol
        <select name="rol" defaultValue={rol} className={ui.input}>
          {ROLES_EQUIPO.map((r) => <option key={r.v} value={r.v}>{r.n}</option>)}
        </select>
        <span className="mt-1.5 block space-y-0.5 text-xs font-normal text-stone-500">
          {ROLES_EQUIPO.map((r) => <span key={r.v} className="block"><b className="font-semibold">{r.n}:</b> {r.d}</span>)}
        </span>
      </label>
      <fieldset>
        <legend className={ui.label}>Equipos</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {EQUIPOS.map((e) => (
            <label key={e.v} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm has-[:checked]:border-oro has-[:checked]:bg-oro-suave">
              <input type="checkbox" name="equipos" value={e.v} defaultChecked={equipos.includes(e.v)} className="size-4" />
              {e.n}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export default async function Equipo() {
  const { supabase, perfil: yo } = await requerir(esAdmin);
  const { data } = await supabase.from("perfiles").select("id, nombre, email, rol, equipos").order("nombre");
  const cuentas = (data ?? []) as Cuenta[];
  const enEquipo = cuentas.filter((c) => c.rol !== "joven" || c.equipos.length > 0)
    .sort((a, b) => ["admin", "encargado", "joven"].indexOf(a.rol) - ["admin", "encargado", "joven"].indexOf(b.rol) || a.nombre.localeCompare(b.nombre, "es"));
  const disponibles = cuentas.filter((c) => c.rol === "joven" && c.equipos.length === 0);

  const etiquetaRol = (r: RolApp) => ({ admin: "Admin", encargado: "Encargado", joven: "Miembro" })[r];

  return (
    <>
      <Encabezado titulo="Equipo" sub="Quién puede hacer qué. Finanzas y evidencias solo las ve quien está en ese equipo (y los admins)." />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <ul className="grid gap-4 lg:col-span-2 xl:grid-cols-2">
          {enEquipo.map((c) => (
            <li key={c.id} className={`${ui.card} space-y-4 p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-titulo">{c.nombre}{c.id === yo.id && <span className="ml-2 text-xs font-normal text-stone-400">(tú)</span>}</p>
                  <p className="truncate text-xs text-stone-500">{c.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${c.rol === "admin" ? "bg-marca text-white" : c.rol === "encargado" ? "bg-oro-suave text-titulo" : "bg-stone-100 text-stone-600"}`}>
                  {etiquetaRol(c.rol)}
                </span>
              </div>
              <details className="group">
                <summary className="cursor-pointer list-none text-sm text-stone-500 hover:text-titulo">
                  {c.rol === "admin" ? "Ve todo" : c.equipos.length ? c.equipos.map((e) => EQUIPOS.find((x) => x.v === e)?.n).join(" · ") : c.rol === "encargado" ? "Asistencia y reportes" : "Sin equipo"}
                  <span className="ml-2 font-semibold text-oro group-open:hidden">Editar</span>
                </summary>
                <Formulario action={actualizarCuenta} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={c.id} />
                  <label className={ui.label}>Nombre<input name="nombre" required defaultValue={c.nombre} className={ui.input} /></label>
                  <CamposRol rol={c.rol} equipos={c.equipos} />
                  <div className="flex justify-end"><Submit>Guardar</Submit></div>
                </Formulario>
                {c.id !== yo.id && (
                  <Formulario action={quitarDelEquipo} className="mt-3 flex justify-end">
                    <input type="hidden" name="id" value={c.id} />
                    <Submit variante="btnMini" confirmar={`¿Quitar a ${c.nombre} del equipo? Sigue en la lista de Jóvenes, pero pierde sus permisos.`}>
                      Quitar del equipo
                    </Submit>
                  </Formulario>
                )}
              </details>
            </li>
          ))}
        </ul>

        <Formulario action={agregarAlEquipo} className={`${ui.card} space-y-4 lg:sticky lg:top-8`}>
          <div>
            <h2 className={ui.h2}>Añadir al equipo</h2>
            <p className={ui.ayuda}>Solo salen quienes ya crearon su cuenta.</p>
          </div>
          {disponibles.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
              Todos los que tienen cuenta ya están en el equipo. Pídeles que se registren en la app.
            </p>
          ) : (
            <>
              <label className={ui.label}>
                ¿Quién?
                <select name="id" required defaultValue="" className={ui.input}>
                  <option value="" disabled>Elige a alguien…</option>
                  {disponibles.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.email ? ` · ${c.email}` : ""}</option>)}
                </select>
              </label>
              <CamposRol />
              <Submit>Añadir</Submit>
            </>
          )}
        </Formulario>
      </div>
    </>
  );
}
