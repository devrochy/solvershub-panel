/** Historial de una prueba en frases claras (SPEC-30): nunca el nombre crudo del campo. */
import type { QaEvento } from "@/lib/api/types";
import { ESTADO_CONFIG, ESTADO_PASO, etiquetaPrueba, type EstadoConfig, type EstadoPaso } from "@/lib/qa/estados";

function paso(valor: string | null | undefined): string {
  return valor ? (ESTADO_PASO[valor as EstadoPaso]?.label ?? valor) : "sin marcar";
}

function config(valor: string | null | undefined): string {
  return valor ? (ESTADO_CONFIG[valor as EstadoConfig]?.label ?? valor) : "—";
}

function recorte(texto: string | null | undefined, max = 120): string {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
}

export function describirEvento(ev: QaEvento): string {
  const enPaso = ev.paso ? `Paso ${ev.paso}: ` : "";
  switch (ev.campo) {
    case "paso.estado":
      return `${enPaso}${paso(ev.antes)} → ${paso(ev.despues)}`;
    case "paso.nota":
      return ev.despues ? `${enPaso}nota «${recorte(ev.despues)}»` : `${enPaso}quitó la nota`;
    case "prueba.estado":
      return `La prueba pasó de ${etiquetaPrueba(ev.antes)} a ${etiquetaPrueba(ev.despues)}`;
    case "prueba.nota":
      return ev.despues ? `Nota general «${recorte(ev.despues)}»` : "Quitó la nota general";
    case "adjunto.agregado":
      return `${enPaso}agregó la captura ${ev.despues ?? ""}`.trim();
    case "adjunto.quitado":
      return `${enPaso}quitó la captura ${ev.antes ?? ""}`.trim();
    case "config.estado":
      return `${config(ev.antes)} → ${config(ev.despues)}`;
    case "config.nota":
      return ev.despues ? `Nota «${recorte(ev.despues)}»` : "Quitó la nota";
    case "ejecucion.iniciada":
      return "Empezó su ejecución";
    case "ejecucion.enviada":
      return "Envió su informe";
    case "ciclo.abierto":
      return `Abrió el ciclo «${ev.despues ?? ""}»`;
    case "ciclo.cerrado":
      return `Cerró el ciclo «${ev.despues ?? ""}»`;
    case "catalogo.importado":
      return `Importó el catálogo ${ev.despues ?? ""}`.trim();
    default:
      return "Cambio registrado";
  }
}
