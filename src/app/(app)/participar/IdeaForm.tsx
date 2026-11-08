"use client";

import { useEffect, useRef } from "react";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { mandarIdea } from "./actions";

/** Buzón de ideas: al mandarse bien, se limpia (para no mandarla dos veces). */
export function IdeaForm() {
  const caja = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const limpiar = (e: Event) => {
      const r = (e as CustomEvent<{ resultado: { ok: boolean; mensaje: string } }>).detail?.resultado;
      if (r?.ok && r.mensaje.includes("idea") && caja.current) caja.current.value = "";
    };
    window.addEventListener("aviso", limpiar);
    return () => window.removeEventListener("aviso", limpiar);
  }, []);
  return (
    <Formulario action={mandarIdea} className="space-y-2">
      <textarea ref={caja} name="texto" required minLength={3} maxLength={1000} rows={3}
        placeholder="Una actividad, una venta, algo que mejorar… Le llega al admin." className={`${ui.input} mt-0`} />
      <div className="flex justify-end"><Submit variante="btnSec">Mandar</Submit></div>
    </Formulario>
  );
}
