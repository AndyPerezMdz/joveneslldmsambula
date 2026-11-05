import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino de los correos de Supabase (plantillas en supabase/correos/):
//   Confirm signup: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
//   Reset password: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/nueva-contrasena" : "/", origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
