/**
 * Forma del informe congelado que guarda la API al enviar una ejecución (`qa_runs.informe`,
 * formato 1, `core/qa/informe.py`). El OpenAPI lo declara como objeto libre: aquí se tipa y se
 * lee con cuidado, sin confiar en que traiga todo.
 */
import type { QaProgreso } from "@/lib/api/types";

export type AdjuntoDeInforme = { id: string; nombre: string; mimetype: string };
export type PasoDeInforme = {
  n: number;
  accion: string;
  esperado?: string | null;
  estado?: string | null;
  nota?: string | null;
  adjuntos: AdjuntoDeInforme[];
};
export type PruebaDeInforme = {
  slug: string;
  titulo: string;
  grupo: string;
  modulo?: string | null;
  prioridad?: string | null;
  hu: string[];
  esperado?: string | null;
  estado: string;
  nota?: string | null;
  pasos: PasoDeInforme[];
};
export type Informe = {
  ciclo: { id: string; nombre: string };
  catalogo: { version: number; fecha: string };
  tester: { id: string; nombre: string; email: string };
  iniciada_en: string;
  enviada_en: string;
  comentario?: string | null;
  progreso: QaProgreso;
  pruebas: PruebaDeInforme[];
  sin_correr: { slug: string; titulo: string; grupo: string }[];
};

export function leerInforme(crudo: unknown): Informe | null {
  if (!crudo || typeof crudo !== "object") return null;
  const i = crudo as Partial<Informe>;
  if (!i.progreso || !Array.isArray(i.pruebas)) return null;
  return {
    ciclo: i.ciclo ?? { id: "", nombre: "" },
    catalogo: i.catalogo ?? { version: 0, fecha: "" },
    tester: i.tester ?? { id: "", nombre: "", email: "" },
    iniciada_en: i.iniciada_en ?? "",
    enviada_en: i.enviada_en ?? "",
    comentario: i.comentario ?? null,
    progreso: i.progreso,
    pruebas: i.pruebas.map((p) => ({ ...p, hu: p.hu ?? [], pasos: (p.pasos ?? []).map((s) => ({ ...s, adjuntos: s.adjuntos ?? [] })) })),
    sin_correr: i.sin_correr ?? [],
  };
}
