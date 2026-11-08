"use client";

import { useState } from "react";
import { Formulario } from "@/components/Formulario";
import { Submit } from "@/components/Submit";
import { ui } from "@/lib/ui";
import { borrarCuenta } from "./actions";

/** Hay que escribir BORRAR para que se active el botón: nadie la borra por accidente. */
export function BorrarCuenta() {
  const [texto, setTexto] = useState("");
  const listo = texto.trim().toUpperCase() === "BORRAR";
  return (
    <Formulario action={borrarCuenta} className="space-y-3">
      <label className={ui.label}>
        Escribe <span className="font-mono">BORRAR</span> para confirmar
        <input name="confirmacion" value={texto} onChange={(e) => setTexto(e.target.value)}
          autoComplete="off" autoCapitalize="characters" className={ui.input} />
      </label>
      {listo ? (
        <Submit variante="btnRojo" confirmar="¿Borrar tu cuenta para siempre? Ya no vas a poder entrar con este correo.">
          Borrar mi cuenta
        </Submit>
      ) : (
        <button type="button" disabled className={ui.btnPeligro}>Borrar mi cuenta</button>
      )}
    </Formulario>
  );
}
