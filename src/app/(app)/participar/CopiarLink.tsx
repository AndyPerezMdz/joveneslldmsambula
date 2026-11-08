"use client";

import { useState } from "react";
import { ui } from "@/lib/ui";

/** Copia el mensaje "¿Quién puede?" con el link, listo para pegar en WhatsApp. */
export function CopiarLink({ ruta, mensaje }: { ruta: string; mensaje: string }) {
  const [hecho, setHecho] = useState<"" | "link" | "mensaje">("");
  async function copiar(que: "link" | "mensaje") {
    const url = `${window.location.origin}${ruta}`;
    const texto = que === "link" ? url : `${mensaje}\n${url}`;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      window.prompt("Copia esto:", texto);
    }
    setHecho(que);
    setTimeout(() => setHecho(""), 2000);
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => copiar("mensaje")} className={ui.btnOro}>
        {hecho === "mensaje" ? "¡Copiado!" : "Copiar mensaje para WhatsApp"}
      </button>
      <button type="button" onClick={() => copiar("link")} className={ui.btnSec}>
        {hecho === "link" ? "¡Copiado!" : "Solo el link"}
      </button>
    </div>
  );
}
