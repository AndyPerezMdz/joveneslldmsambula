export type RolApp = "admin" | "encargado" | "joven";
export type Equipo = "asistencia" | "finanzas" | "evidencias";
export type TipoActividad = "culto" | "venta" | "salida" | "reunion" | "otra";

export type Perfil = { id: string; nombre: string; rol: RolApp; equipos: Equipo[] };

export type Actividad = {
  id: string;
  titulo: string;
  tipo: TipoActividad;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  notas: string | null;
};

/** Fila de resumen_jovenes() */
export type ResumenJoven = {
  joven_id: string;
  nombre: string;
  activo: boolean;
  recientes: number;
  total: number;
  ultima: string | null;
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

type P = Pick<Perfil, "rol" | "equipos"> | null | undefined;
export const esAdmin = (p: P) => p?.rol === "admin";
export const esEncargado = (p: P) => p?.rol === "admin" || p?.rol === "encargado";
/** Encargados cuentan como parte de todos los equipos (igual que en la base). */
export const enEquipo = (p: P, e: Equipo) => !!p && (esEncargado(p) || p.equipos.includes(e));
/** Cualquiera de un equipo puede crear actividades. */
export const puedeOrganizar = (p: P) => !!p && (esEncargado(p) || p.equipos.length > 0);
