/**
 * Vista previa de una importación (HU-QA-12, SPEC-45): el resumen de lo que se crearía. Lo usa la precarga del
 * catálogo; la importación con plantilla fija por agente se retiró de la ficha del agente (2026-11-14).
 */
import type { VistaPreviaImportacion } from "@/lib/api/types";

/** «12 filas: 9 nuevas, 2 ya existían y 1 con error». */
export function resumenDeVistaPrevia(v: Pick<VistaPreviaImportacion, "total_filas" | "nuevas" | "existentes" | "con_errores">): string {
  const partes: string[] = [];
  partes.push(`${v.nuevas} ${v.nuevas === 1 ? "nueva" : "nuevas"}`);
  partes.push(`${v.existentes} ${v.existentes === 1 ? "ya existía" : "ya existían"}`);
  partes.push(`${v.con_errores} con ${v.con_errores === 1 ? "error" : "errores"}`);
  const filas = `${v.total_filas} ${v.total_filas === 1 ? "fila" : "filas"}`;
  return `${filas}: ${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}.`;
}
