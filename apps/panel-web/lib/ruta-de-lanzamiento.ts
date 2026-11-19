/**
 * Lógica pura de la «Ruta de lanzamiento» (HU-UX-24, SPEC-49): las 5 estaciones de la bienvenida y de
 * Nuevo agente, la comparación con lo recomendado («N cambios» y «Usar lo recomendado») y el nombre
 * sugerido con sus ideas. No guarda ni llama a la red: cada flujo decide qué hace con el resultado.
 *
 * Las estaciones son nuevas constantes: la bienvenida y Nuevo agente las adoptan en HU-UX-25 y HU-AOS-86.
 */

import { NOMBRE_AGENTE_MAX, TIPOS_DE_NEGOCIO, type TipoDeNegocio } from "@/lib/onboarding";

/** Las estaciones de las dos rutas. «tipo» (Nuevo agente) y «negocio» (bienvenida) son la estación 1. */
export type EstacionDeLaRuta = "negocio" | "tipo" | "habilidades" | "datos-cliente" | "datos-probar" | "revisar";

export type Estacion = { id: EstacionDeLaRuta; titulo: string; corto?: string };

const COMUNES: readonly Estacion[] = [
  { id: "habilidades", titulo: "Habilidades" },
  { id: "datos-cliente", titulo: "Datos del cliente" },
  { id: "datos-probar", titulo: "Datos para probar" },
  { id: "revisar", titulo: "Revisar y publicar" },
];

/** Bienvenida: 1 Tu negocio · 2 Habilidades · 3 Datos del cliente · 4 Datos para probar · 5 Revisar y publicar. */
export const ESTACIONES_DE_LA_BIENVENIDA: readonly Estacion[] = [{ id: "negocio", titulo: "Tu negocio" }, ...COMUNES];

/** Nuevo agente: 1 Tipo · 2 Habilidades · 3 Datos del cliente · 4 Datos para probar · 5 Revisar y publicar. */
export const ESTACIONES_DE_NUEVO_AGENTE: readonly Estacion[] = [{ id: "tipo", titulo: "Tipo" }, ...COMUNES];

/** El número de la estación (1 a 5), igual en las dos rutas. */
export function numeroDeEstacion(estacion: EstacionDeLaRuta): number {
  return estacion === "negocio" || estacion === "tipo" ? 1 : COMUNES.findIndex((e) => e.id === estacion) + 2;
}

/** El nombre visible de la estación («Tu negocio», «Datos del cliente»…). */
export function tituloDeEstacion(estacion: EstacionDeLaRuta): string {
  return [...ESTACIONES_DE_LA_BIENVENIDA, ...ESTACIONES_DE_NUEVO_AGENTE].find((e) => e.id === estacion)?.titulo ?? "";
}

// ---------------------------------------------------------------------------------- recomendado

/** Lo que se compara en una estación: un valor por opción (radio, interruptor o varias a la vez). */
export type ValoresDeEstacion = Readonly<Record<string, string | number | boolean | null | readonly string[]>>;

/**
 * Las opciones que el dueño cambió frente a lo recomendado, en el orden de `recomendado`.
 * Las listas se comparan como conjuntos (el orden no cuenta) y una clave que falta en `actual`
 * no cuenta como cambio. La barra dice «N cambios» con el largo del resultado.
 */
export function cambiosFrenteARecomendado(actual: ValoresDeEstacion, recomendado: ValoresDeEstacion): string[] {
  return Object.keys(recomendado).filter((clave) => {
    if (!(clave in actual)) return false;
    return !iguales(actual[clave], recomendado[clave]);
  });
}

function iguales(a: ValoresDeEstacion[string], b: ValoresDeEstacion[string]): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    const sa = new Set(a);
    const sb = new Set(b);
    return sa.size === sb.size && [...sa].every((x) => sb.has(x));
  }
  return a === b;
}

/** «1 cambio», «2 cambios». */
export function textoDeCambios(cuantos: number): string {
  return cuantos === 1 ? "1 cambio" : `${cuantos} cambios`;
}

// --------------------------------------------------------------------------------- nombre

/** El nombre sugerido en la bienvenida (D-SPEC-49-6). En Nuevo agente es el primero del tipo. */
export const NOMBRE_SUGERIDO_DE_LA_BIENVENIDA = "Laura";

/** Nombres por tipo para Nuevo agente: el primero es el sugerido («Tomás» en Agenda, como en `rn1`). */
const NOMBRES_DE_NUEVO_AGENTE: Record<TipoDeNegocio, readonly string[]> = {
  ventas: ["Laura", "Sofía", "Mateo"],
  agenda: ["Tomás", "Sofía", "Mateo"],
  cobranza: ["Clara", "Nico", "Sofía"],
  suscripciones: ["Alma", "Leo", "Sofía"],
};

export function nombreSugeridoDelTipo(tipo: TipoDeNegocio): string {
  return NOMBRES_DE_NUEVO_AGENTE[tipo][0];
}

/**
 * Ideas de nombre: el sugerido primero y luego las del tipo, sin repetir y sin nombres de función
 * («Agenda», «Cobros», «Planes») que no suenan a persona. Hasta `cuantas`.
 */
export function ideasDeNombre(sugerido: string, tipo: TipoDeNegocio | null, cuantas = 4): string[] {
  const delTipo = tipo ? [...NOMBRES_DE_NUEVO_AGENTE[tipo], ...(TIPOS_DE_NEGOCIO.find((t) => t.id === tipo)?.nombres ?? [])] : [];
  const funciones = new Set(["Agenda", "Cobros", "Planes"]);
  const todas = [sugerido, ...delTipo].map((n) => n.trim()).filter((n) => n && !funciones.has(n));
  return [...new Set(todas)].slice(0, cuantas);
}

export const TEXTO_SIN_NOMBRE = "Ponle un nombre para seguir";

/** El error del nombre del agente, o `null` si sirve. Sin nombre no se puede avanzar. */
export function errorDelNombre(nombre: string): string | null {
  const limpio = nombre.trim();
  if (!limpio) return TEXTO_SIN_NOMBRE;
  if (limpio.length > NOMBRE_AGENTE_MAX) return `Usa máximo ${NOMBRE_AGENTE_MAX} caracteres.`;
  return null;
}

/** La inicial que va en el círculo de una idea de nombre o del agente. */
export function inicialDe(nombre: string): string {
  return nombre.trim().charAt(0).toLocaleUpperCase("es-CO");
}
