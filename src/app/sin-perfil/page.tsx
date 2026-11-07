import { redirect } from "next/navigation";
import { cerrarSesion } from "@/app/login/actions";
import { AuthShell } from "@/components/AuthShell";
import { getSesion } from "@/lib/supabase/server";
import { ui } from "@/lib/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Falta tu perfil" };

// La sesión existe pero no hay fila en `perfiles` (o la base no está al día).
export default async function SinPerfil() {
  const { user, perfil } = await getSesion();
  if (!user) redirect("/login");
  if (perfil) redirect("/");

  return (
    <AuthShell titulo="Casi listo" subtitulo={user.email ?? undefined}>
      <div className="space-y-4 text-sm text-stone-600">
        <p>Tu cuenta sí entró, pero todavía no tiene perfil en la app.</p>
        <p className="rounded-xl bg-oro-suave p-3 text-titulo">
          <b>Si eres el admin:</b> corre otra vez <code className="font-mono text-xs">supabase/jovenes.sql</code> completo
          en Supabase → SQL Editor. Crea los perfiles que falten y pone la base al día.
        </p>
        <p>Si no eres el admin, avísale a los encargados del grupo.</p>
        <div className="flex gap-2">
          <a href="/" className={`${ui.btn} flex-1`}>Reintentar</a>
          <form action={cerrarSesion} className="flex-1"><button className={`${ui.btnSec} w-full`}>Salir</button></form>
        </div>
      </div>
    </AuthShell>
  );
}
