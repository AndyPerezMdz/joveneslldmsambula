import Image from "next/image";
import Link from "next/link";
import { cerrarSesion } from "@/app/login/actions";
import { enEquipo, esAdmin, type Perfil } from "@/lib/tipos";
import antorcha from "../../public/antorcha-clara.png";
import { BotonTema } from "./BotonTema";
import { NavLinks } from "./NavLinks";

export function Nav({ perfil }: { perfil: Perfil }) {
  const links = [
    { href: "/", n: "Actividades" },
    ...(enEquipo(perfil, "asistencia") ? [{ href: "/jovenes", n: "Jóvenes" }] : []),
    ...(esAdmin(perfil) ? [{ href: "/equipo", n: "Equipo" }] : []),
  ];
  const inicial = perfil.nombre.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="no-print sticky top-0 z-20 border-b border-oro/30 bg-marca/95 text-white shadow-lg shadow-marca/20 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src={antorcha} alt="" className="h-9 w-auto" priority />
          <span className="leading-none">
            <span className="titulo block text-lg font-semibold">Jóvenes</span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.22em] text-oro-claro">La Luz del Mundo</span>
          </span>
        </Link>

        <div className="hidden md:block">
          <NavLinks links={links} />
        </div>

        <div className="ml-auto flex items-center gap-1 text-sm">
          <BotonTema />
          <span className="flex items-center gap-2 py-1 pl-1 pr-2" title={perfil.nombre}>
            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-b from-oro-claro to-oro text-sm font-bold text-marca-oscuro ring-2 ring-white/20">
              {inicial}
            </span>
            <span className="hidden max-w-32 truncate text-white/85 sm:inline">{perfil.nombre}</span>
          </span>
          <form action={cerrarSesion}>
            <button className="rounded-full px-3 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white">Salir</button>
          </form>
        </div>
      </div>
      {links.length > 1 && (
        <div className="border-t border-white/10 px-3 py-1.5 md:hidden">
          <NavLinks links={links} />
        </div>
      )}
    </header>
  );
}
