import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { requerir } from "@/lib/supabase/server";
import { EQUIPOS, esAdmin, ROLES, type Perfil } from "@/lib/tipos";
import { ui } from "@/lib/ui";
import { actualizarCuenta } from "./actions";

export const metadata = { title: "Equipo" };

type Cuenta = Perfil & { email: string | null };
type Ficha = { id: string; nombre: string; perfil_id: string | null };

export default async function Equipo() {
  const { supabase, perfil: yo } = await requerir(esAdmin);
  const [{ data: p }, { data: j }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, email, rol, equipos").order("nombre"),
    supabase.from("jovenes").select("id, nombre, perfil_id").order("nombre"),
  ]);
  const cuentas = (p ?? []) as Cuenta[];
  const fichas = (j ?? []) as Ficha[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={ui.h1}>Equipo</h1>
        <p className={ui.ayuda}>
          Quién puede hacer qué. Los <b>encargados</b> ven y hacen todo menos esta pantalla.
          Los <b>jóvenes</b> solo ven las actividades y su propia asistencia, a menos que estén en un equipo.
        </p>
      </div>

      <ul className="grid gap-4 lg:grid-cols-2">
        {cuentas.map((c) => {
          const ligada = fichas.find((f) => f.perfil_id === c.id);
          return (
            <li key={c.id}>
              <Formulario action={actualizarCuenta} className={`${ui.card} space-y-4 p-5`}>
                <input type="hidden" name="id" value={c.id} />
                <div>
                  <label className={ui.label}>
                    Nombre{c.id === yo.id && <span className="ml-2 text-xs font-normal text-stone-400">(tú)</span>}
                    <input name="nombre" required defaultValue={c.nombre} className={ui.input} />
                  </label>
                  <p className="mt-1 text-xs text-stone-500">{c.email}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={ui.label}>
                    Rol
                    <select name="rol" defaultValue={c.rol} className={ui.input}>
                      {ROLES.map((r) => <option key={r.v} value={r.v}>{r.n}</option>)}
                    </select>
                  </label>
                  <label className={ui.label}>
                    Es el joven…
                    <select name="joven_id" defaultValue={ligada?.id ?? ""} className={ui.input}>
                      <option value="">— Sin ligar —</option>
                      {fichas.filter((f) => !f.perfil_id || f.perfil_id === c.id).map((f) => (
                        <option key={f.id} value={f.id}>{f.nombre}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <fieldset>
                  <legend className={ui.label}>Equipos</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EQUIPOS.map((e) => (
                      <label key={e.v} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm has-[:checked]:border-oro has-[:checked]:bg-oro-suave">
                        <input type="checkbox" name="equipos" value={e.v} defaultChecked={c.equipos.includes(e.v)} className="size-4" />
                        {e.n}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex justify-end"><Submit>Guardar</Submit></div>
              </Formulario>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
