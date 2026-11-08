import { normalizar } from "@/lib/nombres";
import type { TipoActividad } from "@/lib/tipos";

/**
 * Convierte el mensaje que mandan los encargados en actividades:
 *   "2  de Nov -Consagración especial de inicio de mes"
 *   "10 de Nov - Venta de donas"
 *   "Sábado 16 de noviembre: Actividad deportiva 4 a 7 pm"
 * Las líneas que no traen fecha ("Lpds", "Se envía…") se ignoran.
 */
export type Propuesta = {
  fecha: string; titulo: string; tipo: TipoActividad;
  hora: string; hora_fin: string; notas: string; linea: string;
};

const MESES: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5,
  jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9, set: 9, setiembre: 9,
  oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

const mesDe = (t: string) => MESES[normalizar(t).replace(/\.$/, "")] ?? null;

/** Mes del encabezado ("…del mes de Noviembre") */
function mesDelTexto(texto: string): number | null {
  const m = normalizar(texto).match(/\bmes\s+de\s+([a-z]+)/);
  return m ? mesDe(m[1]) : null;
}

export function tipoPorTexto(t: string): TipoActividad {
  const n = normalizar(t);
  if (/\bvent(a|as)\b|\bvender\b|\bkermes/.test(n)) return "venta";
  if (/consagracion|oracion|\bculto|dominical|servicio|alabanza|santa cena|vigilia/.test(n)) return "culto";
  if (/deport|conviv|salida|paseo|excursion|campamento|retiro|visita/.test(n)) return "salida";
  if (/platica|reunion|junta|clase|ensayo|estudio|capacitacion|taller/.test(n)) return "reunion";
  return "otra";
}

const dos = (n: number) => String(n).padStart(2, "0");
const a24 = (h: number, m: number, sufijo: string | undefined, porDefectoPm: boolean) => {
  const s = (sufijo ?? "").toLowerCase().replace(/\./g, "");
  let hh = h;
  if (s.startsWith("p") && hh < 12) hh += 12;
  else if (s.startsWith("a") && hh === 12) hh = 0;
  else if (!s && porDefectoPm && hh >= 1 && hh <= 8) hh += 12;   // "de 4 a 7" en la tarde
  return `${dos(hh)}:${dos(m)}`;
};

/** "4 a 7 pm", "17:00 - 19:00", "a las 5 pm" → horas (y el texto sin ellas). */
function horas(t: string): { hora: string; hora_fin: string; resto: string } {
  const rango = t.match(/(?:de\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?\s*(?:a|-|–|hasta)\s*(?:las\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|hrs?\.?|h\b)?/i);
  if (rango && (rango[3] || rango[6] || rango[2] || rango[5])) {
    const suf = rango[6] && !/^h/i.test(rango[6]) ? rango[6] : undefined;
    const fin = a24(+rango[4], +(rango[5] ?? 0), suf, !rango[6]);
    let ini = a24(+rango[1], +(rango[2] ?? 0), rango[3] ?? suf, !rango[6]);
    if (ini > fin && !rango[3]) ini = a24(+rango[1], +(rango[2] ?? 0), "am", false);
    return { hora: ini, hora_fin: fin, resto: t.replace(rango[0], "") };
  }
  const una = t.match(/(?:a\s+las\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|hrs?\.?|h\b)/i)
    ?? t.match(/a\s+las\s+(\d{1,2})(?::(\d{2}))?()/i)
    ?? t.match(/\b(\d{1,2}):(\d{2})()\b/);
  if (una) {
    const suf = una[3] && !/^h/i.test(una[3]) ? una[3] : undefined;
    return { hora: a24(+una[1], +(una[2] ?? 0), suf, !una[3]), hora_fin: "", resto: t.replace(una[0], "") };
  }
  return { hora: "", hora_fin: "", resto: t };
}

const limpiar = (t: string) =>
  t.replace(/\s+/g, " ").replace(/\s+([,.;])/g, "$1").replace(/^[\s\-–—:.,]+|[\s\-–—:,;]+$/g, "").trim();
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function leerActividades(texto: string, hoy: string): Propuesta[] {
  const anioHoy = Number(hoy.slice(0, 4));
  const mesHoy = Number(hoy.slice(5, 7));
  const mesGeneral = mesDelTexto(texto);
  const salida: Propuesta[] = [];

  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (!linea) continue;
    let t = linea.replace(/^[•*·\-–—]\s*/, "");
    t = t.replace(/^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\.?,?\s+/i, "");

    let dia: number, mes: number | null = null, resto: string;
    const conMes = t.match(/^(\d{1,2})\s*(?:de\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+\.?)\s*(?:de\s+\d{4})?\s*[-–—:.,]*\s*(.*)$/);
    const numerica = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-]\d{2,4})?\s*[-–—:.,]*\s*(.*)$/);
    const sola = t.match(/^(\d{1,2})\s*[-–—:.)]+\s*(.*)$/);
    if (numerica) {
      dia = +numerica[1]; mes = +numerica[2]; resto = numerica[3];
    } else if (conMes && mesDe(conMes[2])) {
      dia = +conMes[1]; mes = mesDe(conMes[2]); resto = conMes[3];
    } else if (sola) {
      dia = +sola[1]; resto = sola[2];
    } else continue;

    mes = mes ?? mesGeneral ?? mesHoy;
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) continue;
    // Si el mes ya pasó hace rato, es del año que entra (en diciembre mandan enero)
    const anio = mes < mesHoy - 2 ? anioHoy + 1 : anioHoy;
    const fecha = `${anio}-${dos(mes)}-${dos(dia)}`;
    if (new Date(`${fecha}T12:00:00Z`).getUTCDate() !== dia) continue;   // 31 de noviembre, etc.

    const h = horas(resto);
    let titulo = limpiar(h.resto);
    if (!titulo) continue;
    let notas = "";
    // Títulos larguísimos: el título es hasta la primera coma; todo va en notas
    if (titulo.length > 60 && titulo.includes(",")) {
      notas = mayuscula(titulo);
      titulo = limpiar(titulo.split(",")[0]);
    }
    titulo = mayuscula(titulo);
    salida.push({ fecha, titulo, tipo: tipoPorTexto(titulo + " " + notas), hora: h.hora, hora_fin: h.hora_fin, notas, linea });
  }
  return salida;
}
