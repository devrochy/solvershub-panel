/**
 * Conversaciones de ejemplo de la vista previa en WhatsApp del recorrido del agente (HU-UX-22, SPEC-47).
 *
 * Son textos fijos armados con lo que el dueño decide en cada paso: no llaman a un modelo ni consumen
 * créditos. Nunca inventan precios ni horarios: lo que no viene de la configuración se dice sin cifras.
 * Solo el paso «Pruébalo» habla con el agente real.
 */

import { muestraDeVoz, type Emojis, type Largo, type Tono } from "@/lib/onboarding";

export type MensajeDeVistaPrevia =
  | { tipo: "cliente"; texto: string }
  | { tipo: "agente"; texto: string }
  | { tipo: "etapa"; texto: string };

export type VozDeVistaPrevia = { tono: Tono; calidez: number; emojis: Emojis; largo: Largo };

/** Lo que responde cuando no puede hacer algo: pasa a una persona, como en el runtime. */
export const RESPUESTA_SIN_HABILIDAD = "Eso no lo puedo resolver por aquí. Te paso con alguien del equipo.";

/** Primer intercambio con la voz elegida: el saludo del cliente y la muestra de voz. */
export function conversacionDeVoz(voz: VozDeVistaPrevia, nombreDelAgente: string, negocio: string): MensajeDeVistaPrevia[] {
  return [
    { tipo: "cliente", texto: "Hola, buenas" },
    { tipo: "agente", texto: muestraDeVoz(voz, nombreDelAgente, negocio) },
  ];
}

export type HabilidadDeVistaPrevia = {
  id: string;
  titulo: string;
  activa: boolean;
  /** Frases de clientes que la disparan; la primera es la que se muestra en el teléfono. */
  frases: readonly string[];
};

/**
 * Una frase de cliente y lo que haría el agente con ella: si el superpoder está activo, dice que lo
 * resuelve (sin cifras inventadas); si está apagado, pasa a una persona.
 */
export function conversacionDeHabilidad(habilidad: HabilidadDeVistaPrevia, frase?: string): MensajeDeVistaPrevia[] {
  const texto = (frase ?? habilidad.frases[0] ?? habilidad.titulo).trim();
  return [
    { tipo: "cliente", texto },
    {
      tipo: "agente",
      texto: habilidad.activa ? `Claro, te ayudo con eso: ${minusculaInicial(habilidad.titulo)}.` : RESPUESTA_SIN_HABILIDAD,
    },
  ];
}

export type EtapaDeVistaPrevia = { nombre: string; proposito: string };

/** El recorrido de una conversación por las etapas del flujo: una marca por etapa y lo que hace en ella. */
export function conversacionDeFlujo(etapas: readonly EtapaDeVistaPrevia[]): MensajeDeVistaPrevia[] {
  return etapas.flatMap((etapa, i) => {
    const nombre = etapa.nombre.trim() || `Etapa ${i + 1}`;
    const proposito = etapa.proposito.trim();
    const marca: MensajeDeVistaPrevia = { tipo: "etapa", texto: `${i + 1} · ${nombre}` };
    return proposito ? [marca, { tipo: "agente", texto: proposito }] : [marca];
  });
}

/** Los últimos mensajes que caben en la hoja inferior del móvil, sin cortar una etapa de su texto. */
export function ultimosMensajes(mensajes: readonly MensajeDeVistaPrevia[], cuantos = 2): MensajeDeVistaPrevia[] {
  const burbujas = mensajes.filter((m) => m.tipo !== "etapa");
  return burbujas.slice(-cuantos);
}

function minusculaInicial(texto: string): string {
  const t = texto.trim();
  return t ? t.charAt(0).toLocaleLowerCase("es-CO") + t.slice(1) : t;
}
