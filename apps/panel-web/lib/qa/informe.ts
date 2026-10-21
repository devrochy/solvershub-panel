/**
 * Forma del informe congelado que guarda la API al enviar una ejecución (`qa_runs.informe`,
 * formato 1/2, `core/qa/informe.py`). El formato 2 (HU-QA-08) agrega `secciones`: las pruebas
 * agrupadas por entorno, área y subsección con el conteo de cada nivel. El OpenAPI lo declara
 * como objeto libre: aquí se tipa y se lee con cuidado, sin confiar en que traiga todo.
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

/** Conteo por nivel del informe agrupado (formato 2). */
export type ConteoDeSeccion = {
  total: number;
  ok: number;
  falla: number;
  bloqueada: number;
  omitida: number;
  en_curso: number;
  sin_correr: number;
};
export type SubseccionDeInforme = ConteoDeSeccion & { subseccion: string };
export type AreaDeInforme = ConteoDeSeccion & { area: string; subsecciones: SubseccionDeInforme[] };
export type SeccionDeInforme = ConteoDeSeccion & { entorno: string; areas: AreaDeInforme[] };

export type Informe = {
  ciclo: { id: string; nombre: string };
  catalogo: { version: number; fecha: string };
  tester: { id: string; nombre: string; email: string };
  iniciada_en: string;
  enviada_en: string;
  comentario?: string | null;
  progreso: QaProgreso;
  secciones?: SeccionDeInforme[];
  pruebas: PruebaDeInforme[];
  sin_correr: { slug: string; titulo: string; grupo: string }[];
};

function leerConteo(crudo: Record<string, unknown>): ConteoDeSeccion {
  const n = (k: string) => (typeof crudo[k] === "number" ? (crudo[k] as number) : 0);
  return {
    total: n("total"),
    ok: n("ok"),
    falla: n("falla"),
    bloqueada: n("bloqueada"),
    omitida: n("omitida"),
    en_curso: n("en_curso"),
    sin_correr: n("sin_correr"),
  };
}

function leerSecciones(crudo: unknown): SeccionDeInforme[] | undefined {
  if (!Array.isArray(crudo)) return undefined;
  return crudo.flatMap((s) => {
    if (!s || typeof s !== "object") return [];
    const seccion = s as Record<string, unknown>;
    if (typeof seccion.entorno !== "string") return [];
    return [
      {
        ...leerConteo(seccion),
        entorno: seccion.entorno,
        areas: Array.isArray(seccion.areas)
          ? seccion.areas.flatMap((a) => {
              if (!a || typeof a !== "object") return [];
              const area = a as Record<string, unknown>;
              if (typeof area.area !== "string") return [];
              return [
                {
                  ...leerConteo(area),
                  area: area.area,
                  subsecciones: Array.isArray(area.subsecciones)
                    ? area.subsecciones.flatMap((sub) => {
                        if (!sub || typeof sub !== "object") return [];
                        const s2 = sub as Record<string, unknown>;
                        if (typeof s2.subseccion !== "string") return [];
                        return [{ ...leerConteo(s2), subseccion: s2.subseccion }];
                      })
                    : [],
                },
              ];
            })
          : [],
      },
    ];
  });
}

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
    secciones: leerSecciones(i.secciones),
    pruebas: i.pruebas.map((p) => ({ ...p, hu: p.hu ?? [], pasos: (p.pasos ?? []).map((s) => ({ ...s, adjuntos: s.adjuntos ?? [] })) })),
    sin_correr: i.sin_correr ?? [],
  };
}
