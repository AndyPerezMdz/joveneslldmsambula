export type RolApp = "admin" | "encargado" | "joven";
export type Equipo = "asistencia" | "finanzas" | "evidencias";
export type TipoActividad = "culto" | "venta" | "salida" | "reunion" | "otra";

export type Perfil = { id: string; nombre: string; rol: RolApp; equipos: Equipo[]; lider_de: Equipo[] };

export type Actividad = {
  id: string;
  titulo: string;
  tipo: TipoActividad;
  fecha: string;
  hora: string | null;
  hora_fin?: string | null;
  lugar: string | null;
  notas: string | null;
  horario_id?: string | null;
  cancelada?: boolean;
};
export const SELECT_ACT = "id, titulo, tipo, fecha, hora, hora_fin, lugar, notas, horario_id, cancelada";

/** Horario fijo (oración de 5, dominical…). dias: 1 = lunes … 7 = domingo */
export type Horario = {
  id: string; titulo: string; tipo: TipoActividad; dias: number[];
  hora: string; hora_fin: string | null; lugar: string | null; activo: boolean;
};
export const DIAS_CORTOS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Fila de resumen_jovenes() */
export type ResumenJoven = {
  joven_id: string;
  nombre: string;
  activo: boolean;
  recientes: number;
  total: number;
  ultima: string | null;
  /** Semanas con culto (con lista pasada) desde su última vez o desde que entró */
  semanas_falta: number;
};

export const ROLES: { v: RolApp; n: string }[] = [
  { v: "admin", n: "Admin" },
  { v: "encargado", n: "Encargado" },
  { v: "joven", n: "Joven" },
];

export const EQUIPOS: { v: Equipo; n: string }[] = [
  { v: "asistencia", n: "Asistencia" },
  { v: "finanzas", n: "Finanzas" },
  { v: "evidencias", n: "Evidencias" },
];

export const TIPOS: { v: TipoActividad; n: string; color: string }[] = [
  { v: "culto", n: "Culto", color: "#134574" },
  { v: "venta", n: "Venta", color: "#b7791f" },
  { v: "salida", n: "Salida", color: "#2f855a" },
  { v: "reunion", n: "Reunión", color: "#6b46c1" },
  { v: "otra", n: "Otra", color: "#64748b" },
];
export const tipo = (v: TipoActividad) => TIPOS.find((t) => t.v === v) ?? TIPOS[4];

/** Semanas sin venir a partir de las cuales hay que buscar a alguien */
export const SEMANAS_ALERTA = 3;
/** "Hay que buscarlo": activo, ya había venido y lleva SEMANAS_ALERTA semanas de culto sin venir. */
export const hayQueBuscar = (j: ResumenJoven) => j.activo && !!j.ultima && j.semanas_falta >= SEMANAS_ALERTA;

/** Días después de la actividad en que todavía se puede corregir la lista (igual que en la base). */
export const DIAS_LISTA = 3;
/**
 * ¿Se puede pasar lista? null = sí; si no, el porqué.
 * `todo` = encargado de asistencia (o admin): puede cambiar listas ya cerradas.
 */
export function bloqueoLista(a: { fecha: string; cancelada?: boolean | null }, hoy: string, todo: boolean): string | null {
  if (a.fecha > hoy) return "Todavía no es el día: la lista se pasa el día de la actividad.";
  if (a.cancelada) return "Esta actividad está cancelada: no se pasa lista.";
  const limite = new Date(`${hoy}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - DIAS_LISTA);
  if (!todo && a.fecha < limite.toISOString().slice(0, 10)) {
    return `Esta lista ya se cerró (pasaron más de ${DIAS_LISTA} días). Solo el encargado de asistencia la puede cambiar.`;
  }
  return null;
}

type P = (Pick<Perfil, "rol" | "equipos"> & { lider_de?: Equipo[] }) | null | undefined;
export const esAdmin = (p: P) => p?.rol === "admin";
export const esEncargado = (p: P) => p?.rol === "admin" || p?.rol === "encargado";
/**
 * Igual que en la base (en_equipo): admin entra a todo; encargados, solo a asistencia;
 * finanzas y evidencias, solo quien esté en ese equipo.
 */
export const enEquipo = (p: P, e: Equipo) =>
  !!p && (esAdmin(p) || (e === "asistencia" && esEncargado(p)) || p.equipos.includes(e) || !!p.lider_de?.includes(e));
/** Encargado de ese grupo (o admin): puede agregar y quitar miembros. */
export const esLider = (p: P, e: Equipo) => !!p && (esAdmin(p) || !!p.lider_de?.includes(e));
/** Ve la pantalla Equipo: admins y encargados de algún grupo. */
export const veEquipo = (p: P) => !!p && (esAdmin(p) || (p.lider_de?.length ?? 0) > 0);
/** Crear, editar, cancelar e importar actividades: solo el admin. */
export const puedeOrganizar = (p: P) => esAdmin(p);

// ---------- Finanzas ----------
export type TipoMov = "entrada" | "salida";
/** Categoría de dinero (tabla `categorias`; finanzas puede crear más). */
export type Categoria = { id: string; nombre: string; tipo: TipoMov | "ambos"; activa: boolean };
export const SELECT_CAT = "id, nombre, tipo, activa";

/** "Renta de sillas" → "renta-de-sillas" */
export const claveCategoria = (n: string) =>
  n.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export type Movimiento = {
  id: string;
  tipo: TipoMov;
  categoria: string;
  concepto: string;
  monto: number;
  fecha: string;
  actividad_id: string | null;
  cooperacion_id: string | null;
  joven_id: string | null;
  anulado: boolean;
  anulado_motivo: string | null;
  comprobante: string | null;
};
export const SELECT_MOV =
  "id, tipo, categoria, concepto, monto, fecha, actividad_id, cooperacion_id, joven_id, anulado, anulado_motivo, comprobante";

export type Cooperacion = {
  id: string;
  concepto: string;
  monto: number;
  fecha_limite: string | null;
  actividad_id: string | null;
  cerrada: boolean;
};
