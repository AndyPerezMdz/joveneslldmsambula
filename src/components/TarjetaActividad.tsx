import Link from "next/link";
import { horaBonita, partesFecha } from "@/lib/fechas";
import { tipo, type Actividad } from "@/lib/tipos";

/**
 * Renglón de una actividad: bloque de fecha + título + tipo.
 * `compacta`: para listas de un solo día (en vez de la fecha, la hora en grande).
 */
export function TarjetaActividad({ a, extra, destacada = false, compacta = false }: {
  a: Pick<Actividad, "id" | "titulo" | "tipo" | "fecha" | "hora" | "hora_fin" | "lugar">;
  extra?: React.ReactNode;
  destacada?: boolean;
  compacta?: boolean;
}) {
  const f = partesFecha(a.fecha);
  const t = tipo(a.tipo);
  const h = horaBonita(a.hora) && (a.hora_fin ? `${horaBonita(a.hora)} – ${horaBonita(a.hora_fin)}` : horaBonita(a.hora));

  return (
    <Link
      href={`/actividades/${a.id}`}
      className={`flex items-center gap-3 rounded-2xl border p-3 pr-3 transition hover:-translate-y-px hover:border-oro/60 hover:shadow-md sm:gap-4 sm:pr-4 ${
        destacada ? "border-oro/50 bg-oro-suave" : "border-stone-200/70 bg-superficie"
      }`}
    >
      {compacta ? (
        <span className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-marca-claro py-2 leading-none text-titulo">
          <span className="titulo text-lg font-semibold tabular-nums">{horaBonita(a.hora)?.split(" ")[0] ?? "—"}</span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-stone-500">{horaBonita(a.hora)?.split(" ").slice(1).join(" ") ?? ""}</span>
        </span>
      ) : (
        <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-marca-claro py-1.5 leading-none text-titulo">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">{f.semana}</span>
          <span className="titulo mt-1 text-xl font-semibold">{f.dia}</span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-stone-500">{f.mes}</span>
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold leading-snug text-titulo ${compacta ? "line-clamp-2" : "truncate"}`}>{a.titulo}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          {!compacta && (
            <span className="chip chip-texto rounded-full px-2 py-0.5 font-semibold" style={{ ["--c" as string]: t.color }}>{t.n}</span>
          )}
          {compacta ? a.hora_fin && <span>hasta {horaBonita(a.hora_fin)}</span> : h && <span>{h}</span>}
          {a.lugar && <span className="truncate">{compacta && !a.hora_fin ? "" : "· "}{a.lugar}</span>}
        </span>
      </span>
      {extra}
    </Link>
  );
}
