import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { Encabezado, Tarjeta } from "@/components/Tarjeta";
import { requerirMiembro } from "@/lib/supabase/server";
import { ui } from "@/lib/ui";
import { cambiarNombre } from "./actions";
import { BorrarCuenta } from "./BorrarCuenta";

export const metadata = { title: "Mi cuenta" };

export default async function Cuenta() {
  const { perfil, user } = await requerirMiembro();
  return (
    <div className="escalonado space-y-5">
      <Encabezado titulo="Mi cuenta" sub={user.email} />

      <Tarjeta titulo="Tu nombre">
        <Formulario action={cambiarNombre} className="space-y-3">
          <label className={ui.label}>
            Nombre completo
            <input name="nombre" defaultValue={perfil.nombre} required minLength={3} maxLength={80}
              autoComplete="name" className={ui.input} />
          </label>
          <p className={ui.ayuda}>Así sales en la lista de asistencia y en finanzas. Nombre y apellidos, sin apodos.</p>
          <Submit>Guardar</Submit>
        </Formulario>
      </Tarjeta>

      <Tarjeta titulo="Borrar mi cuenta" tono="alerta">
        <div className="mb-4 space-y-2 text-sm text-red-900/80">
          <p>Se borra tu acceso, tu correo y tu teléfono. Ya no vas a poder entrar.</p>
          <p>
            Tu nombre, tu asistencia y tus cooperaciones <b>se quedan</b> en la lista del grupo, porque las cuentas
            del grupo no pueden quedar incompletas. Si algún día regresas, te registras y tocas &quot;Soy yo&quot;.
          </p>
        </div>
        <BorrarCuenta />
      </Tarjeta>
    </div>
  );
}
