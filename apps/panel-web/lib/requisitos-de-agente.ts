/**
 * Avisos de «falta configurar» del editor de agentes (HU-AOS-50, ADR-0155).
 *
 * El backend dice qué le falta al negocio (`kind`, la habilidad y la sección); aquí se traduce a
 * lenguaje de negocio y se elige a qué pantalla lleva. Nunca se muestra la clave cruda. Es un aviso:
 * publicar no se bloquea.
 */
import type { Requirement } from "@/lib/api/types";
import { CONTENIDO } from "@/lib/primeros-pasos";

export interface CopiaDeRequisito {
  /** Lo que falta, en una frase. */
  titulo: string;
  descripcion: string;
  /** Texto del enlace (lo que pasa al pulsarlo). */
  accion: string;
  href: string;
}

export function copiaDelRequisito(r: Requirement): CopiaDeRequisito {
  if (r.kind === "sin_contenido" && r.content) {
    const contenido = CONTENIDO[r.content];
    return { titulo: contenido.titulo, descripcion: contenido.descripcion, accion: contenido.accion, href: contenido.href };
  }
  return {
    titulo: `Configura ${r.title}`,
    descripcion: r.explanation || "Completa sus datos para que tu agente la pueda usar.",
    accion: "Configurar",
    href: `/habilidades/${encodeURIComponent(r.skill)}`,
  };
}

/** Los avisos que tocan a una habilidad (para ponerlos junto a sus superpoderes). */
export function requisitosDeHabilidad(requisitos: Requirement[], habilidad: string): Requirement[] {
  return requisitos.filter((r) => r.skill === habilidad);
}
