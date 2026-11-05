import Link from "next/link";

/** Bloque del dashboard: título, acción opcional a la derecha y contenido. */
export function Tarjeta({ titulo, accion, href, children, className = "", tono = "normal" }: {
  titulo?: string;
  accion?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
  tono?: "normal" | "alerta" | "oro";
}) {
  const fondo = {
    normal: "border-stone-200/70 bg-superficie",
    alerta: "border-red-200 bg-red-50",
    oro: "border-oro/40 bg-oro-suave",
  }[tono];
  return (
    <section className={`rounded-3xl border p-5 shadow-[0_1px_2px_rgb(23_32_44/0.04)] ${fondo} ${className}`}>
      {(titulo || accion) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {titulo && <h2 className={`text-[15px] font-semibold ${tono === "alerta" ? "text-red-900" : "text-titulo"}`}>{titulo}</h2>}
          {accion && href && (
            <Link href={href} className="shrink-0 text-xs font-semibold text-oro hover:text-titulo">{accion} →</Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Número grande con etiqueta. */
export function Indicador({ etiqueta, valor, detalle, href, color = "text-titulo" }: {
  etiqueta: string; valor: string; detalle?: string; href?: string; color?: string;
}) {
  const cuerpo = (
    <>
      <p className="text-xs font-medium text-stone-500">{etiqueta}</p>
      <p className={`titulo mt-1 text-2xl font-semibold tabular-nums ${color}`}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-stone-500">{detalle}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-stone-200/70 bg-superficie p-4 shadow-[0_1px_2px_rgb(23_32_44/0.04)]";
  return href ? <Link href={href} className={`${cls} transition hover:border-oro/60`}>{cuerpo}</Link> : <div className={cls}>{cuerpo}</div>;
}

/** Encabezado de página: título + subtítulo + botones. */
export function Encabezado({ titulo, sub, children }: { titulo: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="titulo text-3xl font-semibold text-titulo">{titulo}</h1>
        {sub && <p className="mt-1 text-sm text-stone-500">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
