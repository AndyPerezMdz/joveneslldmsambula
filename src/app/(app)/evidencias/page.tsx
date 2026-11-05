import Link from "next/link";
import { Album } from "@/components/Album";
import { driveListo, espacioDrive, fotosDrive, repartir, type Foto } from "@/lib/drive";
import { fechaLarga, partesFecha } from "@/lib/fechas";
import { requerir } from "@/lib/supabase/server";
import { enEquipo, tipo, type Actividad } from "@/lib/tipos";
import { ui } from "@/lib/ui";

export const metadata = { title: "Evidencias" };

const gb = (b: number) => `${(b / 1024 ** 3).toFixed(1)} GB`;

export default async function Evidencias() {
  const { supabase } = await requerir((p) => enEquipo(p, "evidencias"));
  const sube = true;

  if (!driveListo()) {
    return (
      <div className="space-y-4">
        <h1 className={ui.h1}>Evidencias</h1>
        <p className={`${ui.card} text-sm text-stone-500`}>
          Todavía no está conectado el Drive del grupo. Hay que poner las variables de Google en Vercel (ver el README).
        </p>
      </div>
    );
  }

  let fotos: Foto[] = [];
  let espacio: { usado: number; limite: number | null } | null = null;
  let error = "";
  try {
    [fotos, espacio] = await Promise.all([fotosDrive(), espacioDrive()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "No se pudo leer el Drive.";
  }

  const { data } = await supabase.from("actividades").select("id, titulo, tipo, fecha, hora, hora_fin, lugar, notas, horario_id, cancelada").eq("cancelada", false).order("fecha", { ascending: false });
  const actividades = (data ?? []) as Actividad[];
  const { album, sueltas } = repartir(fotos, actividades);
  const conFotos = actividades.filter((a) => album.has(a.id));

  // Fotos sin actividad, agrupadas por día
  const sueltasPorDia = new Map<string, Foto[]>();
  for (const f of sueltas) sueltasPorDia.set(f.fecha, [...(sueltasPorDia.get(f.fecha) ?? []), f]);
  const dias = [...sueltasPorDia.keys()].sort().reverse();

  const pct = espacio?.limite ? (espacio.usado / espacio.limite) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className={ui.h1}>Evidencias</h1>
        <p className={ui.ayuda}>{fotos.length} fotos · se acomodan solas por la fecha en que se tomaron.</p>
      </div>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {espacio?.limite && (
        <div className={`rounded-2xl border p-4 ${pct >= 90 ? "border-red-300 bg-red-50" : pct >= 75 ? "border-amber-200 bg-amber-50" : "border-stone-200/70 bg-superficie"}`}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-titulo">Espacio del Drive</span>
            <span className="tabular-nums text-stone-500">{gb(espacio.usado)} de {gb(espacio.limite)}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-200/70">
            <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-600" : pct >= 75 ? "bg-amber-500" : "bg-marca-medio"}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          {pct >= 75 && (
            <p className={`mt-2 text-sm ${pct >= 90 ? "text-red-700" : "text-amber-900"}`}>
              {pct >= 90 ? "El Drive está casi lleno: pronto ya no se van a poder subir fotos." : "El Drive se está llenando."}{" "}
              Borren fotos repetidas o borrosas, o descarguen las viejas a una computadora.
            </p>
          )}
        </div>
      )}

      {sube && (
        <p className="rounded-2xl bg-oro-suave p-4 text-sm text-titulo">
          <b>¿Cómo subo fotos?</b> Desde la app de Google Drive, a la carpeta <b>Evidencias</b> del grupo (o una subcarpeta).
          En unos minutos aparecen aquí, ya acomodadas en su actividad.
        </p>
      )}

      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
      {conFotos.map((a) => {
        const f = partesFecha(a.fecha);
        const fs = album.get(a.id)!;
        return (
          <section key={a.id} className="space-y-3">
            <Link href={`/actividades/${a.id}`} className="flex items-baseline justify-between gap-3">
              <span>
                <span className="block font-semibold text-titulo">{a.titulo}</span>
                <span className="text-xs text-stone-500">{f.semana} {f.dia} {f.mes} · {tipo(a.tipo).n}</span>
              </span>
              <span className="shrink-0 text-xs text-stone-500">{fs.length} fotos</span>
            </Link>
            <Album fotos={fs} max={8} masHref={`/actividades/${a.id}`} />
          </section>
        );
      })}
      </div>

      {dias.length > 0 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-oro">Sin actividad</h2>
            <p className={ui.ayuda}>Fotos de días en que no hay actividad registrada. Si fue una, créala con esa fecha y se acomodan solas.</p>
          </div>
          {dias.map((d) => (
            <div key={d} className="space-y-2">
              <p className="text-sm font-medium first-letter:uppercase">{fechaLarga(d)}</p>
              <Album fotos={sueltasPorDia.get(d)!} max={8} />
            </div>
          ))}
        </section>
      )}

      {!error && fotos.length === 0 && (
        <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
          Todavía no hay fotos en la carpeta Evidencias.
        </p>
      )}
    </div>
  );
}
