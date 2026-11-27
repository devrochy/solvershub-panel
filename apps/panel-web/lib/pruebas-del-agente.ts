import type {
  EscenarioDePrueba,
  PruebasEscenarioInforme,
  PruebasEstimado,
  PruebasEstimadoDeK,
  PruebasInforme,
  PruebasIntento,
} from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

/**
 * Pruebas del agente (SPEC-53, HU-AOS-105, ADR-0212): lógica pura de la pestaña «Pruebas». Estados en palabras,
 * el costo de cada k, el resultado por escenario y los errores de la API en el idioma del dueño. Nunca se
 * muestra un enum crudo.
 */

/** La pestaña solo existe en la ficha de un especialista activo y con la bandera encendida en este entorno. */
export function pruebasHabilitadas(valor: string | undefined): boolean {
  const v = (valor ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "si" || v === "on";
}

export type Tono = "success" | "danger" | "warning" | "info" | "neutral";

export const ESTADO_DE_ESCENARIO: Record<
  EscenarioDePrueba["estado"],
  { label: string; tono: Tono }
> = {
  borrador: { label: "Borrador", tono: "warning" },
  aprobado: { label: "Aprobado", tono: "success" },
};

export const ORIGEN_DE_ESCENARIO: Record<EscenarioDePrueba["origen"], string> =
  { ia: "IA", manual: "Manual" };

/** Estados de la corrida (`estado` llega como texto libre del API). */
export function estadoDeCorrida(estado: string): { label: string; tono: Tono } {
  switch (estado) {
    case "en_cola":
      return { label: "En cola", tono: "neutral" };
    case "corriendo":
      return { label: "En curso", tono: "info" };
    case "terminada":
      return { label: "Terminada", tono: "success" };
    case "cancelada":
      return { label: "Cancelada", tono: "neutral" };
    case "cortada_por_tope":
      return { label: "Se detuvo al llegar al tope", tono: "warning" };
    case "fallo":
      return { label: "No se pudo completar", tono: "danger" };
    default:
      return { label: "Sin estado", tono: "neutral" };
  }
}

/** ¿La corrida sigue viva? Mientras sea así el panel consulta su avance. */
export function corridaEnCurso(estado: string): boolean {
  return estado === "en_cola" || estado === "corriendo";
}

export const ESTADO_DE_INTENTO: Record<
  PruebasIntento["estado"],
  { label: string; tono: Tono }
> = {
  pasa: { label: "Pasó", tono: "success" },
  falla: { label: "Falló", tono: "danger" },
  no_se_pudo_probar: { label: "No se pudo probar", tono: "neutral" },
};

/** Cómo terminó la conversación simulada. */
export function finDeIntento(fin: string | null): string | null {
  switch (fin) {
    case "objetivo":
      return "El cliente logró lo que quería.";
    case "se_rindio":
      return "El cliente se rindió.";
    case "tope":
      return "La conversación llegó al tope de turnos.";
    default:
      return null;
  }
}

export const TIPO_DE_ARREGLO = {
  regla: "Regla nueva",
  respuesta: "Respuesta nueva",
  dato: "Dato que falta",
} as const;

export const TITULO_DE_ARREGLO = {
  regla: "Agregar una regla al agente.",
  respuesta: "Agregar una respuesta al agente.",
  dato: "Completar un dato del negocio.",
} as const;

/** Por qué «Aplicar al borrador» no está disponible. */
export function motivoNoAplicable(
  motivo: string | null | undefined,
  seccion?: string | null,
): string | null {
  switch (motivo) {
    case "tipo":
      return seccion
        ? `Este arreglo se hace a mano, en ${seccion}.`
        : "Este arreglo se hace a mano en Personalizar.";
    case "sin_borrador":
      return "El agente no tiene un borrador abierto. Abre Personalizar para crearlo y vuelve aquí.";
    case "ya_aplicado":
      return "Este arreglo ya está en el borrador.";
    case null:
    case undefined:
      return null;
    default:
      return "Este arreglo no se puede aplicar ahora.";
  }
}

/** Los errores de la API de pruebas, en palabras del dueño. Lo que no está aquí usa el mensaje del servidor. */
export const ERROR_DE_PRUEBAS: Record<string, string> = {
  corrida_en_curso:
    "Ya hay una corrida en marcha. Espera a que termine o cancélala para empezar otra.",
  corridas_por_dia:
    "Llegaste al máximo de corridas de las últimas 24 horas. Intenta de nuevo más tarde.",
  demasiados_escenarios: "Elige hasta 20 escenarios por corrida.",
  sin_escenarios: "Aprueba al menos un escenario para poder probar.",
  escenario_no_aprobado:
    "Solo se prueban escenarios aprobados. Aprueba los que estén en borrador.",
  sin_fallidas: "No hay escenarios que hayan fallado para volver a probar.",
  k_fuera_de_rango:
    "Esa cantidad de repeticiones no está permitida en tu negocio.",
  titulo_repetido: "Ya tienes un escenario con ese título.",
  en_curso:
    "Hay una corrida en marcha: no se pueden cambiar los escenarios hasta que termine.",
  tope_de_escenarios:
    "Llegaste al máximo de escenarios de este agente. Borra alguno para agregar otro.",
  tool_desconocida:
    "Una de las acciones que indicaste no existe en este agente.",
  tools_en_conflicto:
    "Una misma acción no puede ser esperada y prohibida a la vez.",
  escenario_incompleto:
    "Al escenario le falta el título o lo que pide el cliente.",
  ia_no_disponible:
    "La IA no está disponible ahora. Intenta de nuevo en unos minutos.",
  propuesta_invalida:
    "La IA no pudo proponer escenarios esta vez. Intenta de nuevo.",
  arreglo_ya_aplicado: "Este arreglo ya está aplicado.",
  arreglo_no_aplicable:
    "Este arreglo se hace a mano: el servidor no lo puede escribir en el borrador.",
  sin_borrador:
    "El agente no tiene un borrador abierto. Abre Personalizar para crearlo.",
  sin_arreglo: "Este resultado no tiene arreglo sugerido.",
  resultado_no_es_falla: "Solo se puede marcar una prueba que falló.",
  stale_lock_version:
    "El borrador cambió mientras mirabas. Revisa el cambio de nuevo antes de aplicarlo.",
  agente_archivado: "Un agente archivado no se prueba. Reactívalo primero.",
};

/** Mensaje de un error del BFF: el texto propio del `code` si lo hay, si no el del servidor. */
export function mensajeDeError(
  error: { error?: string | null; code?: string | null } | null | undefined,
  respaldo: string,
): string {
  if (error?.code && ERROR_DE_PRUEBAS[error.code])
    return ERROR_DE_PRUEBAS[error.code];
  return typeof error?.error === "string" && error.error
    ? error.error
    : respaldo;
}

/** «1 vez», «3 veces». */
export function vecesEnPalabras(k: number): string {
  return k === 1 ? "1 vez" : `${formatNumber(k)} veces`;
}

/** «1 repetición», «3 repeticiones». */
export function repeticionesEnPalabras(k: number): string {
  return k === 1 ? "1 repetición" : `${formatNumber(k)} repeticiones`;
}

/** El estimado de un k; si ese k no viene, el más cercano que sí. `null` si no hay ninguno. */
export function estimadoDeK(
  estimado: PruebasEstimado | null,
  k: number,
): PruebasEstimadoDeK | null {
  if (!estimado || estimado.por_k.length === 0) return null;
  return (
    estimado.por_k.find((p) => p.k === k) ??
    estimado.por_k[estimado.por_k.length - 1]
  );
}

/** Los k que se pueden elegir: de 1 al tope del negocio. */
export function opcionesDeK(estimado: PruebasEstimado | null): number[] {
  return estimado ? estimado.por_k.map((p) => p.k).sort((a, b) => a - b) : [];
}

/** Créditos que le faltan al negocio para correr con ese k; 0 si alcanza o no hay tope. */
export function creditosQueFaltan(
  estimado: PruebasEstimado | null,
  k: number,
): number {
  const fila = estimadoDeK(estimado, k);
  if (!fila || fila.alcanza || estimado?.saldo == null) return 0;
  return Math.max(0, fila.del_saldo - estimado.saldo);
}

/**
 * Resultado de un escenario con todos sus intentos. Las pruebas que el dueño marcó «esto no es una falla» salen
 * de la cuenta, igual que en el porcentaje del servidor.
 */
export type ResultadoDeEscenario = {
  estado: "pasa" | "falla" | "no_se_pudo_probar" | "sin_probar";
  label: string;
  tono: Tono;
  pasaron: number;
  total: number;
};

export function resultadoDeEscenario(
  e: PruebasEscenarioInforme | undefined,
): ResultadoDeEscenario {
  if (!e || e.intentos.length === 0)
    return {
      estado: "sin_probar",
      label: "Sin probar",
      tono: "neutral",
      pasaron: 0,
      total: 0,
    };
  const vigentes = e.intentos.filter((i) => !i.juez_equivocado);
  const juzgables = vigentes.filter((i) => i.estado !== "no_se_pudo_probar");
  const pasaron = juzgables.filter((i) => i.estado === "pasa").length;
  const total = juzgables.length;
  if (vigentes.length === 0)
    return {
      estado: "pasa",
      label: "Pasó",
      tono: "success",
      pasaron: 0,
      total: 0,
    };
  if (total === 0)
    return {
      estado: "no_se_pudo_probar",
      label: "No se pudo probar",
      tono: "neutral",
      pasaron: 0,
      total: 0,
    };
  if (pasaron === total) {
    return {
      estado: "pasa",
      label:
        total === 1
          ? "Pasó"
          : `Pasó ${formatNumber(pasaron)} de ${formatNumber(total)}`,
      tono: "success",
      pasaron,
      total,
    };
  }
  return {
    estado: "falla",
    label:
      total === 1 || pasaron === 0
        ? "Falló"
        : `Pasó ${formatNumber(pasaron)} de ${formatNumber(total)}`,
    tono: "danger",
    pasaron,
    total,
  };
}

/** Los escenarios del informe que fallaron (al menos un intento vigente falló), primero en la lista. */
export function ordenarPorFalla(
  escenarios: PruebasEscenarioInforme[],
): PruebasEscenarioInforme[] {
  const peso = (e: PruebasEscenarioInforme) =>
    resultadoDeEscenario(e).estado === "falla" ? 0 : 1;
  return [...escenarios].sort((a, b) => peso(a) - peso(b));
}

/** Cuántos escenarios fallaron: lo que ofrece «Volver a probar las N que fallaron». */
export function cuantosFallaron(informe: PruebasInforme): number {
  return informe.escenarios.filter(
    (e) => resultadoDeEscenario(e).estado === "falla",
  ).length;
}

/** Avance de la corrida en porcentaje para la barra (0 a 100). */
export function porcentajeDeAvance(
  informe: Pick<PruebasInforme, "progreso">,
): number {
  const { hechos, total } = informe.progreso;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((hechos / total) * 100));
}

/** Estado de un escenario dentro de una corrida en curso: terminado, conversando o en cola. */
export function avanceDeEscenario(
  e: PruebasEscenarioInforme,
  k: number,
): { label: string; tono: Tono } {
  const hechos = e.intentos.length;
  if (hechos >= k) return { label: "Terminado", tono: "success" };
  if (hechos > 0)
    return {
      label: `Va en la repetición ${formatNumber(hechos + 1)} de ${formatNumber(k)}`,
      tono: "info",
    };
  return { label: "En cola", tono: "neutral" };
}

/** El texto del botón de la lista: «Probar 8 aprobados» / «Probar 1 aprobado». */
export function textoDeProbar(aprobados: number): string {
  return aprobados === 1
    ? "Probar 1 aprobado"
    : `Probar ${formatNumber(aprobados)} aprobados`;
}

/** Tope de escenarios por corrida del servidor (`demasiados_escenarios`). */
export const MAX_ESCENARIOS_POR_CORRIDA = 20;

/** Criterios, una por línea, a lista (sin vacíos ni repetidos). */
export function criteriosDeTexto(texto: string): string[] {
  const vistos = new Set<string>();
  const lista: string[] = [];
  for (const linea of texto.split("\n")) {
    const limpia = linea.trim();
    if (limpia && !vistos.has(limpia)) {
      vistos.add(limpia);
      lista.push(limpia);
    }
  }
  return lista;
}

/** Una ruta del diff (`guardrails[2]`) en palabras. */
export function rutaEnPalabras(ruta: string): string {
  if (ruta.startsWith("guardrails")) return "Reglas del agente";
  if (ruta.startsWith("respuestas") || ruta.startsWith("responses"))
    return "Respuestas del agente";
  return "Borrador del agente";
}

/** Valor de un cambio del diff para mostrarlo: texto tal cual, el resto en JSON legible. */
export function valorDeCambio(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "string") return valor;
  return JSON.stringify(valor, null, 2);
}
