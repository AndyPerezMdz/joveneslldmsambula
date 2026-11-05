"use client";

import { useRef, useState } from "react";
import { CATEGORIAS, type TipoMov } from "@/lib/tipos";
import { ui } from "@/lib/ui";

/** Entrada/salida cambia las categorías que se ofrecen. */
export function CamposMovimiento({ tipoInicial, fecha, actividades, actividad }: {
  tipoInicial: TipoMov;
  fecha: string;
  actividades: { id: string; titulo: string; fecha: string }[];
  actividad?: string;
}) {
  const [tipo, setTipo] = useState<TipoMov>(tipoInicial);
  const [vista, setVista] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  // Las fotos del celular pesan 3–5 MB: se achican aquí (1600 px, JPEG) antes de subir.
  async function achicar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setAviso(null);
    if (!f) return setVista(null);
    try {
      const img = await createImageBitmap(f);
      const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.8));
      if (!blob) throw new Error();
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "ticket.jpg", { type: "image/jpeg" }));
      if (archivo.current) archivo.current.files = dt.files;
      setVista(URL.createObjectURL(blob));
    } catch {
      setAviso("No se pudo leer esa foto. Intenta con otra.");
      if (archivo.current) archivo.current.value = "";
      setVista(null);
    }
  }
  const cats = CATEGORIAS.filter((c) => c.para === tipo || c.para === "ambos");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className={ui.label}>¿Entró o salió dinero?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["entrada", "salida"] as const).map((t) => (
            <label key={t} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 py-3 font-semibold transition ${
              tipo === t
                ? t === "entrada" ? "border-green-700 bg-green-50 text-green-800" : "border-red-600 bg-red-50 text-red-700"
                : "border-stone-200 text-stone-500"
            }`}>
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
              {t === "entrada" ? "+ Entró" : "− Salió"}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={ui.label}>
        Monto
        <input name="monto" inputMode="decimal" required placeholder="$0.00" className={`${ui.input} text-lg font-semibold tabular-nums`} />
      </label>
      <label className={ui.label}>
        Categoría
        <select key={tipo} name="categoria" defaultValue={cats[0].v} className={ui.input}>
          {cats.map((c) => <option key={c.v} value={c.v}>{c.n}</option>)}
        </select>
      </label>
      <label className={`${ui.label} sm:col-span-2`}>
        Concepto
        <input name="concepto" required placeholder={tipo === "entrada" ? "Venta de tamales, ofrenda especial…" : "Masa y hojas, gasolina…"} className={ui.input} />
      </label>
      <div className={`${ui.label} sm:col-span-2`}>
        Foto del ticket <span className="font-normal text-stone-400">(opcional)</span>
        <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50/80 p-3 font-normal hover:border-oro">
          {vista
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={vista} alt="Ticket" className="size-16 rounded-lg object-cover" />
            : <span className="flex size-16 items-center justify-center rounded-lg bg-superficie text-2xl text-stone-400">+</span>}
          <span className="text-sm text-stone-500">{vista ? "Toca para cambiarla" : "Tómale foto o elígela de la galería"}</span>
          <input ref={archivo} type="file" name="ticket" accept="image/*" capture="environment" onChange={achicar} className="sr-only" />
        </label>
        {aviso && <p className="mt-1 text-sm text-red-700">{aviso}</p>}
      </div>
      <label className={ui.label}>
        Fecha
        <input name="fecha" type="date" required defaultValue={fecha} className={ui.input} />
      </label>
      <label className={ui.label}>
        Actividad <span className="font-normal text-stone-400">(opcional)</span>
        <select name="actividad_id" defaultValue={actividad ?? ""} className={ui.input}>
          <option value="">— Ninguna —</option>
          {actividades.map((a) => <option key={a.id} value={a.id}>{a.titulo} · {a.fecha.slice(8)}/{a.fecha.slice(5, 7)}</option>)}
        </select>
      </label>
    </div>
  );
}
