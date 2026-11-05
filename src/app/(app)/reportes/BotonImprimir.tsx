"use client";

import { ui } from "@/lib/ui";

/** Abre el diálogo de impresión: ahí se elige "Guardar como PDF". */
export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={ui.btnOro}>
      Descargar PDF
    </button>
  );
}
