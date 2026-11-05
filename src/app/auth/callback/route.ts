import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Regreso de Google / Apple. En Supabase → Auth → URL Configuration → Redirect URLs
// debe estar: https://TU-DOMINIO/auth/callback (y http://localhost:3000/auth/callback)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destino, origin));
  }
  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
