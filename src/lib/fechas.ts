// Todo en hora de Mérida. Las fechas viajan como "YYYY-MM-DD".
const TZ = "America/Merida";

/** Hoy en Mérida, "YYYY-MM-DD". */
export function hoy(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const aDate = (f: string) => new Date(`${f}T12:00:00Z`);

export function sumarDias(f: string, n: number): string {
  const d = aDate(f);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function semanasEntre(desde: string, hasta: string): number {
  return Math.floor((aDate(hasta).getTime() - aDate(desde).getTime()) / (7 * 864e5));
}

/** "sábado 8 de noviembre" */
export function fechaLarga(f: string): string {
  return aDate(f).toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

/** { dia: "8", mes: "nov", semana: "sáb" } para el bloque de fecha */
export function partesFecha(f: string) {
  const d = aDate(f);
  const o = (x: Intl.DateTimeFormatOptions) => d.toLocaleDateString("es-MX", { timeZone: "UTC", ...x }).replace(".", "");
  return { dia: String(d.getUTCDate()), mes: o({ month: "short" }), semana: o({ weekday: "short" }) };
}

/** "19:30:00" → "7:30 p. m." */
export function horaBonita(h: string | null): string | null {
  if (!h) return null;
  const [H, M] = h.split(":");
  const n = Number(H);
  return `${((n + 11) % 12) + 1}:${M} ${n < 12 ? "a. m." : "p. m."}`;
}

/** "hoy", "hace 1 semana", "hace 5 semanas" */
export function haceCuanto(f: string, ref = hoy()): string {
  const dias = Math.round((aDate(ref).getTime() - aDate(f).getTime()) / 864e5);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  const s = Math.floor(dias / 7);
  return s === 1 ? "hace 1 semana" : `hace ${s} semanas`;
}

/** "2026-11", -1 → "2026-10" */
export function mesVecino(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** "2026-11" → "noviembre de 2026" */
export const nombreMes = (mes: string) =>
  new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("es-MX", { timeZone: "UTC", month: "long", year: "numeric" });
