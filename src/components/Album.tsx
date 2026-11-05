import type { Foto } from "@/lib/drive";

/** Cuadrícula de fotos. Cada una abre la original en otra pestaña. */
export function Album({ fotos, max, masHref }: { fotos: Foto[]; max?: number; masHref?: string }) {
  const visibles = max ? fotos.slice(0, max) : fotos;
  const resto = fotos.length - visibles.length;
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {visibles.map((f, i) => (
        <a key={f.id}
          {...(resto > 0 && i === visibles.length - 1 && masHref
            ? { href: masHref }
            : { href: `/api/foto/${f.id}?t=full`, target: "_blank", rel: "noreferrer" })}
          className="relative block aspect-square overflow-hidden rounded-xl bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/foto/${f.id}`} alt={f.nombre} loading="lazy" className="size-full object-cover transition hover:scale-105" />
          {resto > 0 && i === visibles.length - 1 && (
            <span className="absolute inset-0 flex items-center justify-center bg-marca-oscuro/60 text-lg font-semibold text-white">
              +{resto}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
