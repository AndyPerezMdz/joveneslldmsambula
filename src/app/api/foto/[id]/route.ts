import { type NextRequest } from "next/server";
import { dentroDeLaCarpeta, driveListo, imagenDrive } from "@/lib/drive";
import { getSesion } from "@/lib/supabase/server";

// Visor de fotos: el navegador nunca habla con Drive directo.
//   /api/foto/ID         → miniatura (600 px)
//   /api/foto/ID?t=full  → original
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, perfil } = await getSesion();
  if (!user || !perfil) return new Response("Sin sesión", { status: 401 });
  if (!driveListo() || !/^[\w-]{10,}$/.test(id)) return new Response("No encontrado", { status: 404 });
  if (!(await dentroDeLaCarpeta(id))) return new Response("No encontrado", { status: 404 });

  const completa = request.nextUrl.searchParams.get("t") === "full";
  const r = await imagenDrive(id, completa ? undefined : 600);
  if (!r.ok || !r.body) return new Response("No se pudo cargar", { status: 502 });

  return new Response(r.body, {
    headers: {
      "Content-Type": r.headers.get("Content-Type") ?? "image/jpeg",
      // Privado: solo en el navegador de quien la vio
      "Cache-Control": "private, max-age=86400",
    },
  });
}
