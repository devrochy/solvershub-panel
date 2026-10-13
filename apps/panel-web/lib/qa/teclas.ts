/**
 * Atajos de la ejecución paso a paso (SPEC-30, HU-QA-03): A aprueba, F falla, B bloqueado,
 * O omite el paso activo; J y K cambian de prueba. Nunca dentro de un campo ni con
 * modificadores, para no pisar los atajos del navegador ni la paleta (Ctrl/⌘ K).
 */
import type { EstadoPaso } from "@/lib/qa/estados";

export type AccionDeTecla = { tipo: "marcar"; estado: EstadoPaso } | { tipo: "prueba"; paso: 1 | -1 } | null;

const MARCAR: Record<string, EstadoPaso> = { a: "ok", f: "falla", b: "bloqueado", o: "omitido" };

export function accionDeTecla(evento: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  enCampo: boolean;
}): AccionDeTecla {
  if (evento.enCampo || evento.ctrlKey || evento.metaKey || evento.altKey) return null;
  const tecla = evento.key.toLowerCase();
  if (tecla in MARCAR) return { tipo: "marcar", estado: MARCAR[tecla] };
  if (tecla === "j") return { tipo: "prueba", paso: 1 };
  if (tecla === "k") return { tipo: "prueba", paso: -1 };
  return null;
}
