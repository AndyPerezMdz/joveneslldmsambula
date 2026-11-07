"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { semanasEntre } from "@/lib/fechas";
import { clienteNavegador } from "@/lib/supabase/client";
import { SEMANAS_ALERTA } from "@/lib/tipos";
import { ui } from "@/lib/ui";

type Joven = { id: string; nombre: string; recientes: number; ultima: string | null };
type Op = { a: string; j: string; p: boolean };

// Cambios que no se han podido guardar (sin internet). Viven en este navegador.
const COLA = "cola-asistencia";
const leerCola = (): Op[] => {
  try { return JSON.parse(localStorage.getItem(COLA) ?? "[]"); } catch { return []; }
};
const guardarCola = (c: Op[]) => {
  try { localStorage.setItem(COLA, JSON.stringify(c)); } catch {}
};

/**
 * Pase de lista "encubierto": un toque por persona.
 * Se marca al instante en pantalla y se guarda en segundo plano;
 * si no hay internet, se queda en cola y se manda cuando regrese.
 */
export function PaseLista({ actividadId, jovenes, presentesIniciales, hoy }: {
  actividadId: string;
  jovenes: Joven[];
  presentesIniciales: string[];
  hoy: string;
}) {
  const [presentes, setPresentes] = useState(() => new Set(presentesIniciales));
  const [pendientes, setPendientes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const mandando = useRef(false);
  const supabase = useMemo(() => clienteNavegador(), []);

  const mandar = useCallback(async () => {
    if (mandando.current) return;
    mandando.current = true;
    try {
      let cola = leerCola();
      while (cola.length) {
        const op = cola[0];
        const { error: e } = op.p
          ? await supabase.from("asistencias").upsert(
              { actividad_id: op.a, joven_id: op.j },
              { onConflict: "actividad_id,joven_id", ignoreDuplicates: true },
            )
          : await supabase.from("asistencias").delete().eq("actividad_id", op.a).eq("joven_id", op.j);
        if (e) {
          // Sin red: se queda en cola. Cualquier otro error: se descarta y se avisa.
          if (!navigator.onLine || /fetch|network/i.test(e.message)) break;
          setError("No se pudo guardar un cambio. Recarga la página y revisa la lista.");
        }
        // Quitar ESA operación (mientras se mandaba pudieron tocar a alguien más)
        cola = leerCola();
        const i = cola.findIndex((o) => o.a === op.a && o.j === op.j && o.p === op.p);
        if (i >= 0) cola.splice(i, 1);
        guardarCola(cola);
      }
      setPendientes(leerCola().filter((o) => o.a === actividadId).length);
    } finally {
      mandando.current = false;
    }
  }, [supabase, actividadId]);

  // Al abrir: aplicar lo que quedó pendiente de esta actividad y reintentar
  useEffect(() => {
    const mias = leerCola().filter((o) => o.a === actividadId);
    if (mias.length) {
      setPresentes((s) => {
        const n = new Set(s);
        for (const o of mias) (o.p ? n.add(o.j) : n.delete(o.j));
        return n;
      });
    }
    mandar();
    window.addEventListener("online", mandar);
    return () => window.removeEventListener("online", mandar);
  }, [actividadId, mandar]);

  function tocar(j: string) {
    const p = !presentes.has(j);
    setPresentes((s) => {
      const n = new Set(s);
      if (p) n.add(j); else n.delete(j);
      return n;
    });
    // Si ya había un cambio pendiente de esa persona, el nuevo lo reemplaza
    const cola = leerCola().filter((o) => !(o.a === actividadId && o.j === j));
    guardarCola([...cola, { a: actividadId, j, p }]);
    setPendientes((n) => n + 1);
    mandar();
  }

  // Los que vienen seguido arriba: se marca a todos sin hacer scroll
  const ordenados = useMemo(
    () => [...jovenes].sort((a, b) => b.recientes - a.recientes || a.nombre.localeCompare(b.nombre, "es")),
    [jovenes],
  );
  const q = busca.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const visibles = q
    ? ordenados.filter((j) => j.nombre.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(q))
    : ordenados;
  const seguido = visibles.filter((j) => j.recientes > 0);
  const poco = visibles.filter((j) => j.recientes === 0);

  const fila = (j: Joven) => {
    const on = presentes.has(j.id);
    const semanas = j.ultima ? semanasEntre(j.ultima, hoy) : null;
    const iniciales = j.nombre.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
    return (
      <li key={j.id}>
        <button
          type="button"
          onClick={() => tocar(j.id)}
          aria-pressed={on}
          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[.99] ${
            on ? "border-green-700/40 bg-green-50" : "border-stone-200 bg-superficie hover:border-oro/60"
          }`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-claro text-xs font-bold text-titulo">
            {iniciales}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{j.nombre}</span>
            {semanas !== null && semanas >= SEMANAS_ALERTA && (
              <span className="text-xs font-medium text-red-600">{semanas} semanas sin venir</span>
            )}
            {j.ultima === null && <span className="text-xs text-stone-400">Nunca ha venido</span>}
          </span>
          <span key={on ? "si" : "no"} className={`flex size-6 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition-colors ${
            on ? "pop border-green-700 bg-green-700 text-white" : "border-stone-300 text-transparent"
          }`}>✓</span>
        </button>
      </li>
    );
  };

  return (
    <div className={`${ui.card} space-y-4 p-4 sm:p-6`}>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-marca-claro px-4 py-3">
        <span className="font-semibold text-titulo">Presentes</span>
        <span className="titulo text-2xl font-semibold tabular-nums text-titulo">
          {presentes.size} <span className="text-base text-stone-500">/ {jovenes.length}</span>
        </span>
      </div>

      {pendientes > 0 && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {pendientes === 1 ? "1 cambio" : `${pendientes} cambios`} sin guardar. Se mandan solos cuando haya internet.
        </p>
      )}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar nombre…"
        aria-label="Buscar nombre"
        className={`${ui.input} mt-0`}
      />

      {jovenes.length === 0 && (
        <p className="py-4 text-center text-sm text-stone-500">
          Todavía no hay jóvenes en la lista. Agrégalos abajo o en la sección Jóvenes.
        </p>
      )}

      {seguido.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Vienen seguido</h3>
          <ul className="grid gap-2 sm:grid-cols-2">{seguido.map(fila)}</ul>
        </div>
      )}
      {poco.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Últimamente no han venido</h3>
          <ul className="grid gap-2 sm:grid-cols-2">{poco.map(fila)}</ul>
        </div>
      )}
      {q && visibles.length === 0 && (
        <p className="py-2 text-center text-sm text-stone-500">Nadie se llama así. Agrégalo abajo.</p>
      )}
    </div>
  );
}
