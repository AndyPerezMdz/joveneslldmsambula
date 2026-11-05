/** "José  Pérez" / "JOSÉ PÉREZ" → "jose perez" (para comparar). */
export const normalizar = (t: string) =>
  t.trim().replace(/\s+/g, " ").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "van", "von"]);

/** "JOSÉ DE LA CRUZ" → "José de la Cruz" (solo si viene todo en mayúsculas o minúsculas). */
export function bonito(t: string) {
  const limpio = t.trim().replace(/\s+/g, " ");
  if (limpio !== limpio.toUpperCase() && limpio !== limpio.toLowerCase()) return limpio;
  return limpio.toLowerCase().split(" ").map((p, i) =>
    i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1),
  ).join(" ");
}
