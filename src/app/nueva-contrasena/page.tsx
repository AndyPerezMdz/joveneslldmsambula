import { AuthShell } from "@/components/AuthShell";
import { requerirMiembro } from "@/lib/supabase/server";
import { NuevaForm } from "./NuevaForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contraseña nueva" };

// Se llega aquí desde el correo de "restablecer contraseña" (ya con sesión).
export default async function NuevaContrasena() {
  const { perfil } = await requerirMiembro();
  return (
    <AuthShell titulo="Contraseña nueva" subtitulo={`Hola, ${perfil.nombre.split(" ")[0]}. Elige una que sí te acuerdes.`}>
      <NuevaForm />
    </AuthShell>
  );
}
