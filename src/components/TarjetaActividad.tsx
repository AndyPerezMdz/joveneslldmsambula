import Link from "next/link";
import { horaBonita, partesFecha } from "@/lib/fechas";
import { tipo, type Actividad } from "@/lib/tipos";

/** Renglón de una actividad: bloque de fecha + título + tipo. */
export function TarjetaActividad({ a, extra, destacada = false }: {
  a: Pick<Actividad, "id" | "titulo" | "tipo" | "fecha" | "hora" | "lugar">;
  extra?: React.ReactNode;
  destacada?: boolean;
}) {
  const f = partesFecha(a.fecha);
  const t = tipo(a.tipo);
  const h = horaBonita(a.hora);

  return (
    <Link
      href={`/actividades/${a.id}`}
      className={`flex items-center gap-4 rounded-2xl border p-3 pr-4 transition hover:-translate-y-px hover:border-oro/60 hover:shadow-md ${
        destacada ? "border-oro/50 bg-oro-suave" : "border-stone-200/70 bg-superficie"
      }`}
    >
      <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-marca-claro py-1.5 leading-none text-titulo">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">{f.semana}</span>
        <span className="titulo mt-1 text-xl font-semibold">{f.dia}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-stone-500">{f.mes}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-titulo">{a.titulo}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          <span className="chip chip-texto rounded-full px-2 py-0.5 font-semibold" style={{ ["--c" as string]: t.color }}>
            {t.n}
          </span>
          {h && <span>{h}</span>}
          {a.lugar && <span className="truncate">· {a.lugar}</span>}
        </span>
      </span>
      {extra}
    </Link>
  );
}
