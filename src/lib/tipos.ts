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

// ---------- Finanzas ----------
export type TipoMov = "entrada" | "salida";
export type CategoriaMov =
  | "venta" | "cooperacion" | "donacion" | "ofrenda"
  | "compra" | "comida" | "transporte" | "material" | "otro";

export const CATEGORIAS: { v: CategoriaMov; n: string; para: TipoMov | "ambos" }[] = [
  { v: "venta", n: "Venta", para: "entrada" },
  { v: "cooperacion", n: "Cooperación", para: "entrada" },
  { v: "donacion", n: "Donación", para: "entrada" },
  { v: "ofrenda", n: "Ofrenda", para: "entrada" },
  { v: "compra", n: "Compra", para: "salida" },
  { v: "comida", n: "Comida", para: "salida" },
  { v: "transporte", n: "Transporte", para: "salida" },
  { v: "material", n: "Material", para: "salida" },
  { v: "otro", n: "Otro", para: "ambos" },
];
export const categoria = (v: CategoriaMov) => CATEGORIAS.find((c) => c.v === v)?.n ?? "Otro";

export type Movimiento = {
  id: string;
  tipo: TipoMov;
  categoria: CategoriaMov;
  concepto: string;
  monto: number;
  fecha: string;
  actividad_id: string | null;
  cooperacion_id: string | null;
  joven_id: string | null;
  anulado: boolean;
  anulado_motivo: string | null;
};
export const SELECT_MOV =
  "id, tipo, categoria, concepto, monto, fecha, actividad_id, cooperacion_id, joven_id, anulado, anulado_motivo";

export type Cooperacion = {
  id: string;
  concepto: string;
  monto: number;
  fecha_limite: string | null;
  actividad_id: string | null;
  cerrada: boolean;
};
