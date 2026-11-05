import { InstalarApp } from "@/components/InstalarApp";
import { Menu } from "@/components/Menu";
import { menuPara } from "@/lib/menu";
import { requerirMiembro } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requerirMiembro();
  return (
    <>
      <Menu items={menuPara(perfil)} nombre={perfil.nombre} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <InstalarApp />
          {children}
        </main>
      </div>
    </>
  );
}
