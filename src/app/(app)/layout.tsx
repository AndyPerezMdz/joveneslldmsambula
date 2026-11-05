import { Nav } from "@/components/Nav";
import { requerirMiembro } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requerirMiembro();
  return (
    <>
      <Nav perfil={perfil} />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">{children}</main>
    </>
  );
}
