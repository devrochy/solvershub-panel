import type { Requirement } from "@/lib/api/types";
import type { FormasDePago } from "@/lib/formas-de-pago";

/**
 * Semáforo «Listo para responder» de la creación rápida (SPEC-47, HU-AOS-81): con lo que el editor ya
 * tiene (requisitos de `/requirements`, si hay contenido cargado, las formas de pago y los
 * superpoderes encendidos) dice si el agente ya puede atender, por módulo, en palabras.
 *
 * - Rojo: falta configurar una habilidad o no tiene ningún superpoder (no podría atender).
 * - Ámbar: le falta contenido (catálogo, servicios o cartera) o una forma de pago quedó a medias.
 * - Verde: puede responder.
 */

export type Luz = "verde" | "ambar" | "rojo";
export type Pendiente = { luz: Exclude<Luz, "verde">; texto: string };
export type Semaforo = { luz: Luz; titulo: string; pendientes: Pendiente[] };

const TITULO: Record<Luz, string> = {
  verde: "Listo para responder",
  ambar: "Puede responder, pero le falta algo",
  rojo: "Todavía no puede responder",
};

export function semaforo({
  requisitos,
  formas,
  superpoderesActivos,
  conDatos,
}: {
  requisitos: readonly Requirement[];
  formas: FormasDePago | null;
  superpoderesActivos: number;
  conDatos: boolean;
}): Semaforo {
  const pendientes: Pendiente[] = [];
  if (superpoderesActivos === 0) pendientes.push({ luz: "rojo", texto: "Enciende al menos un superpoder en «Habilidades y formas de pago»." });
  for (const r of requisitos) {
    pendientes.push(
      r.kind === "habilidad_sin_configurar"
        ? { luz: "rojo", texto: `${r.title}: ${r.explanation}` }
        : conDatos
          ? { luz: "ambar", texto: `${r.title}: revisa que los datos de prueba alcancen.` }
          : { luz: "ambar", texto: `${r.title}: ${r.explanation}` },
    );
  }
  for (const f of formas?.forms ?? []) {
    if (f.estado === "falta_configurar") pendientes.push({ luz: "ambar", texto: `${f.label}: ${f.falta}` });
  }
  const luz: Luz = pendientes.some((p) => p.luz === "rojo") ? "rojo" : pendientes.length ? "ambar" : "verde";
  return { luz, titulo: TITULO[luz], pendientes };
}
