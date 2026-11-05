"use client";

import { useActionState } from "react";
import { ui } from "@/lib/ui";
import { cambiarContrasena } from "./actions";

export function NuevaForm() {
  const [error, action, pendiente] = useActionState(cambiarContrasena, null);
  return (
    <form action={action} className="space-y-4">
      <label className={ui.label}>
        Contraseña nueva
        <input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={ui.input} />
      </label>
      <label className={ui.label}>
        Repítela
        <input name="repetir" type="password" minLength={8} required autoComplete="new-password" className={ui.input} />
      </label>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={pendiente} className={`${ui.btn} w-full`}>
        {pendiente ? "Guardando…" : "Guardar y entrar"}
      </button>
    </form>
  );
}
