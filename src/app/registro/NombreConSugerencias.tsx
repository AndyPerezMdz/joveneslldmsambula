"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clienteNavegador } from "@/lib/supabase/client";
import { ui } from "@/lib/ui";

/**
 * Campo "Nombre completo" que sugiere cómo sale la persona en la lista del grupo.
 * Pregunta a la base (buscar_nombres) mientras escribe, con una pausa para no saturar.
 * Al elegir una sugerencia se escribe EXACTO, así la cuenta se liga sí o sí.
 */
export function NombreConSugerencias() {
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const supabase = useMemo(() => clienteNavegador(), []);
  const turno = useRef(0);

  useEffect(() => {
    const q = texto.trim();
    if (elegido === q || q.replace(/\s/g, "").length < 3) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    const mio = ++turno.current;
    setBuscando(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("buscar_nombres", { p_texto: q });
      if (mio !== turno.current) return; // llegó una respuesta vieja
      setSugerencias(((data ?? []) as { nombre: string }[]).map((x) => x.nombre));
      setBuscando(false);
      setAbierto(true);
    }, 280);
    return () => clearTimeout(t);
  }, [texto, elegido, supabase]);

  function elegir(n: string) {
    setTexto(n);
    setElegido(n);
    setSugerencias([]);
    setAbierto(false);
  }

  const q = texto.trim();
  const listo = elegido !== null && elegido === q;
  const sinResultados = abierto && !buscando && q.replace(/\s/g, "").length >= 3 && sugerencias.length === 0 && !listo;

  return (
    <div className={ui.label}>
      <label htmlFor="nombre">Nombre completo</label>
      <div className="relative">
        <input
          id="nombre" name="nombre" required autoComplete="off" placeholder="Nombre(s) y apellidos"
          pattern="\s*\S+(\s+\S+)+\s*" title="Escribe tu nombre y al menos un apellido"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setElegido(null); }}
          onFocus={() => setAbierto(true)}
          role="combobox" aria-expanded={sugerencias.length > 0} aria-controls="sugerencias-nombre" aria-autocomplete="list"
          className={`${ui.input} ${listo ? "border-green-700/50 pr-10" : ""}`}
        />
        {listo && <span className="pop absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 font-bold text-green-700" aria-hidden>✓</span>}
      </div>

      {sugerencias.length > 0 && (
        <ul id="sugerencias-nombre" role="listbox"
          className="mt-2 overflow-hidden rounded-xl border border-oro/40 bg-superficie font-normal shadow-lg [animation:entrar_.18s_ease-out]">
          <li className="bg-oro-suave px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-titulo">¿Eres alguno de ellos?</li>
          {sugerencias.map((n) => (
            <li key={n} role="option" aria-selected={false}>
              <button type="button" onClick={() => elegir(n)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[15px] text-tinta transition hover:bg-marca-claro">
                {n}<span className="text-xs text-oro">Soy yo</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <span className="mt-1.5 block text-xs font-normal text-stone-500">
        {listo
          ? "Listo: tu cuenta se va a ligar con tu nombre de la lista."
          : sinResultados
            ? "No te encontramos en la lista. Revisa cómo lo escribiste, o sigue: los encargados te agregan después."
            : "¿No sabes cómo sales en la lista? Escribe tu nombre y abajo salen los parecidos."}
        {buscando && <span className="ml-1 text-oro">Buscando…</span>}
      </span>
    </div>
  );
}
