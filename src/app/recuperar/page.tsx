import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { RecuperarForm } from "./RecuperarForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar contraseña" };

export default function Recuperar() {
  return (
    <AuthShell titulo="¿Se te olvidó?" subtitulo="Te mandamos un enlace para poner una nueva">
      <RecuperarForm />
      <p className="mt-5 text-center text-sm text-stone-500">
        <Link href="/login" className="font-semibold text-titulo hover:text-oro">Volver a entrar</Link>
      </p>
    </AuthShell>
  );
}
