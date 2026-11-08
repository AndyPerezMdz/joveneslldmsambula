import { enEquipo, veEquipo, type Perfil } from "@/lib/tipos";

export type ClaveMenu = "inicio" | "actividades" | "jovenes" | "finanzas" | "evidencias" | "reportes" | "equipo";
export type ItemMenu = { href: string; n: string; icono: ClaveMenu };

/** Qué secciones ve cada quien (el orden es el del menú). */
export function menuPara(p: Perfil): ItemMenu[] {
  return [
    { href: "/", n: "Inicio", icono: "inicio" as const },
    { href: "/actividades", n: "Actividades", icono: "actividades" as const },
    ...(enEquipo(p, "asistencia") ? [{ href: "/jovenes", n: "Jóvenes", icono: "jovenes" as const }] : []),
    ...(enEquipo(p, "finanzas") ? [{ href: "/finanzas", n: "Finanzas", icono: "finanzas" as const }] : []),
    ...(enEquipo(p, "evidencias") ? [{ href: "/evidencias", n: "Evidencias", icono: "evidencias" as const }] : []),
    ...(enEquipo(p, "asistencia") || enEquipo(p, "finanzas") ? [{ href: "/reportes", n: "Reportes", icono: "reportes" as const }] : []),
    ...(veEquipo(p) ? [{ href: "/equipo", n: "Equipo", icono: "equipo" as const }] : []),
  ];
}
