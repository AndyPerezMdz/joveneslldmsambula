const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

/** 1234.5 → "$1,234.50" */
export const pesos = (n: number | string | null | undefined) => mxn.format(Number(n ?? 0));

/** "1,234.50" / "$1234" / "1234,5" → 1234.5 (null si no es un monto válido) */
export function leerMonto(v: string): number | null {
  const limpio = v.replace(/[$\s]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(limpio);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
