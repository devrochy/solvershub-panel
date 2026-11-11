/**
 * Resumen de Configuración (rediseño B): cada ajuste se lee en una línea con su valor actual
 * («Lun a vie, 9:00 a. m. a 6:00 p. m.», «Cercano · emojis: pocos») y se abre para cambiarlo.
 * Lógica pura: la pantalla solo pinta lo que devuelve.
 */

import type { CatalogoConfig, OpcionConfig } from "@/lib/api/types";
import { etiquetaDeHora } from "@/lib/calendario/formulario";
import { etiquetaDeValor } from "@/lib/catalogo-config";
import { DIAS_FRANJA, type Franja } from "@/lib/horario-atencion";

const corto = (texto: string, max = 60) => {
  const una = texto.replace(/\s+/g, " ").trim();
  return una.length > max ? `${una.slice(0, max - 1)}…` : una;
};

const tramo = (f: { from: string; to: string }) => `${etiquetaDeHora(f.from)} a ${etiquetaDeHora(f.to)}`;

/**
 * «Lun a vie, 9:00 a. m. a 6:00 p. m. · sáb, 9:00 a. m. a 1:00 p. m.»: los días seguidos con el mismo
 * horario se juntan. Sin franjas, el asistente atiende a toda hora.
 */
export function horarioEnPalabras(franjas: readonly Franja[]): string {
  if (franjas.length === 0) return "Sin horario: atiende a toda hora";
  const porDia = DIAS_FRANJA.map((_, dia) =>
    franjas
      .filter((f) => f.day === dia)
      .sort((a, b) => a.from.localeCompare(b.from))
      .map(tramo)
      .join(" y "),
  );
  const partes: string[] = [];
  let i = 0;
  while (i < porDia.length) {
    if (!porDia[i]) {
      i += 1;
      continue;
    }
    let fin = i;
    while (fin + 1 < porDia.length && porDia[fin + 1] === porDia[i]) fin += 1;
    const desde = DIAS_FRANJA[i].toLowerCase();
    const hasta = DIAS_FRANJA[fin].toLowerCase();
    const dias = fin === i ? desde : fin === i + 1 ? `${desde} y ${hasta}` : `${desde} a ${hasta}`;
    partes.push(`${dias}, ${porDia[i]}`);
    i = fin + 1;
  }
  const texto = partes.join(" · ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** El valor de una opción del catálogo en palabras, para leerlo en el resumen. */
export function valorEnPalabras(opcion: OpcionConfig, valor: unknown): string {
  switch (opcion.tipo) {
    case "elegir_una": {
      const elegido = (opcion.valores ?? []).find((v) => v.valor === valor);
      return elegido ? etiquetaDeValor(elegido) : String(valor ?? "");
    }
    case "booleano":
      return valor === true ? "Sí" : "No";
    case "entero":
    case "decimal":
      return `${valor ?? 0}${opcion.unidad ? ` ${opcion.unidad}` : ""}`;
    case "lista_de_textos":
      return Array.isArray(valor) && valor.length ? (valor as string[]).map((v) => `«${v}»`).join(", ") : "Ninguna";
    case "franjas":
      return horarioEnPalabras(Array.isArray(valor) ? (valor as Franja[]) : []);
    case "elegir_varias":
      return "";
    default:
      return typeof valor === "string" && valor.trim() ? corto(valor) : "Sin escribir";
  }
}

/**
 * Resumen de los grupos del catálogo que pinta una sección: las primeras opciones con algo que decir, en
 * palabras. Las elecciones se leen solas («Cercano»); los números y listas llevan su nombre («Calidez: 3 puntos»).
 */
export function resumenDeGrupos(
  catalogo: CatalogoConfig | null,
  grupos: readonly string[],
  valores: Record<string, unknown>,
  max = 3,
): string {
  if (!catalogo) return "";
  const partes: string[] = [];
  for (const grupo of grupos) {
    for (const opcion of catalogo.opciones.filter((o) => o.grupo === grupo)) {
      if (partes.length >= max) break;
      if (opcion.tipo === "elegir_varias" || opcion.tipo === "texto_largo") continue;
      const valor = valores[opcion.clave];
      if (opcion.tipo === "lista_de_textos" && !(Array.isArray(valor) && valor.length)) continue;
      const texto = valorEnPalabras(opcion, valor);
      if (!texto) continue;
      const solo = opcion.tipo === "elegir_una" || opcion.tipo === "franjas" || opcion.tipo === "texto";
      partes.push(solo ? texto : `${opcion.etiqueta.toLowerCase()}: ${texto}`);
    }
  }
  return partes.join(" · ");
}

/** Cuánto recuerda y cuánto busca (Memoria), en palabras. */
export const MEMORIA_RECUERDA = [
  { value: "5", label: "Lo último", turnos: 5 },
  { value: "10", label: "Normal", turnos: 10 },
  { value: "30", label: "Mucho", turnos: 30 },
] as const;

export const MEMORIA_BUSCA = [
  { value: "0", label: "Nada", fichas: 0 },
  { value: "2", label: "Poco", fichas: 2 },
  { value: "4", label: "Normal", fichas: 4 },
  { value: "8", label: "Mucho", fichas: 8 },
] as const;

/** Etiqueta del valor más cercano entre las opciones en palabras: «Normal» para 10 mensajes. */
export function cercano<T extends { label: string }>(opciones: readonly T[], valor: number, de: (o: T) => number): T {
  return opciones.reduce((mejor, o) => (Math.abs(de(o) - valor) < Math.abs(de(mejor) - valor) ? o : mejor));
}

export function memoriaEnPalabras(memoria: { short_term_turns: number; rag_top_k: number }): string {
  const recuerda = cercano(MEMORIA_RECUERDA, memoria.short_term_turns, (o) => o.turnos);
  const busca = cercano(MEMORIA_BUSCA, memoria.rag_top_k, (o) => o.fichas);
  return `Recuerda ${memoria.short_term_turns} mensajes (${recuerda.label.toLowerCase()}) · busca: ${busca.label.toLowerCase()}`;
}

/** Temperatura del modelo en palabras: qué tan parecidas salen las respuestas. */
export const TEMPERATURAS = [
  { value: "0.2", label: "Precisas", valor: 0.2 },
  { value: "0.5", label: "Equilibradas", valor: 0.5 },
  { value: "0.9", label: "Creativas", valor: 0.9 },
] as const;

export function temperaturaEnPalabras(t: number): string {
  return cercano(TEMPERATURAS, t, (o) => o.valor).label;
}

/** «2 habilidades activas · Cobranza con un problema». */
export function habilidadesEnPalabras(
  habilidades: readonly { display_name?: string | null; name: string; enabled_for_tenant: boolean; status: string; tenant_health_error?: string | null }[],
): string {
  if (habilidades.length === 0) return "Ninguna instalada";
  const activas = habilidades.filter((h) => h.enabled_for_tenant);
  const conProblema = habilidades.filter((h) => h.enabled_for_tenant && (h.tenant_health_error || h.status === "error"));
  const base = activas.length === 0 ? "Ninguna activa" : activas.length === 1 ? `${activas[0].display_name || activas[0].name} activa` : `${activas.length} activas`;
  if (conProblema.length === 0) return base;
  return `${base} · ${conProblema.map((h) => h.display_name || h.name).join(", ")} con un problema`;
}
