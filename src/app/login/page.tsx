import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getSesion } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; aviso?: string }> }) {
  const { next, error, aviso } = await searchParams;
  // Si ya hay sesión, no tiene caso mostrar el login: se va a la app (o a explicar qué falta)
  const { user, perfil } = await getSesion();
  if (user) redirect(perfil ? "/" : "/sin-perfil");
  return (
    <AuthShell titulo="Jóvenes" subtitulo="Asistencia, finanzas y evidencias del grupo">
      {error === "link" && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Ese enlace ya expiró o ya se usó. Inicia sesión normalmente.
        </p>
      )}
      {aviso === "borrada" && (
        <p className="mb-4 rounded-lg bg-oro-suave p-3 text-sm text-titulo">
          Tu cuenta quedó borrada. Si algún día regresas, aquí te esperamos.
        </p>
      )}
      <LoginForm next={next ?? "/"} />
      <p className="mt-4 text-center text-sm">
        <Link href="/recuperar" className="text-stone-500 hover:text-titulo">¿Olvidaste tu contraseña?</Link>
      </p>
      <p className="mt-2 text-center text-sm text-stone-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-titulo hover:text-oro">Regístrate</Link>
      </p>
    </AuthShell>
  );
}
