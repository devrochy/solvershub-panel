import { LARGOS, type Emojis, type Largo, type Tono } from "@/lib/onboarding";

/**
 * Voz y estilo (HU-CFG-12): lo que la pantalla necesita saber de velocidad y envío, sin escribir
 * listas de valores en el componente. Los valores y las etiquetas salen del catálogo; aquí solo
 * viven el orden de presentación, los iconos y las frases que resumen la decisión.
 */

export const VELOCIDADES = ["rapido", "natural", "pausado"] as const;
export const VELOCIDADES_SECUNDARIAS = ["inmediato", "corto"] as const;
export const ENVIOS = ["un_mensaje", "pocos_cortos", "varios_cortos"] as const;

/** Las dos velocidades que no se ofrecen de entrada pero siguen siendo válidas. */
export function esVelocidadSecundaria(clave: string): boolean {
  return (VELOCIDADES_SECUNDARIAS as readonly string[]).includes(clave);
}

/** El largo de la muestra de voz más cercano al tope guardado. 0 = sin tope: se muestra detallada. */
export function largoDeMaxLength(max: number): Largo {
  if (!Number.isFinite(max) || max <= 0) return "detalladas";
  return LARGOS.reduce(
    (mejor, largo) => (Math.abs(largo.caracteres - max) < Math.abs(mejor.caracteres - max) ? largo : mejor),
    LARGOS[1],
  ).id;
}

export type ValorDeRitmo = { etiqueta: string; nota?: string };

/**
 * «espera 15 s y envía un solo mensaje.» La nota de la velocidad ya viene en minúsculas del catálogo;
 * la etiqueta del envío se pasa a minúsculas para que la frase se lea seguida.
 */
export function resumenDeRitmo(velocidad: ValorDeRitmo | null, envio: ValorDeRitmo | null): string {
  if (!velocidad || !envio) return "";
  const cuando = (velocidad.nota || velocidad.etiqueta).trim().toLowerCase();
  return `${cuando} y envía ${envio.etiqueta.trim().toLowerCase()}.`;
}

/** El negocio en la muestra de voz: una línea corta, sin arrastrar toda la descripción al prompt visual. */
export function negocioParaLaMuestra(descripcion: string, max = 48): string {
  const una = descripcion.replace(/\s+/g, " ").trim();
  if (una.length <= max) return una;
  return `${una.slice(0, max - 1).trimEnd()}…`;
}

/** Los tipos de la bienvenida, con el mismo vocabulario que la sección. */
export type VozDeLaMuestra = { tono: Tono; calidez: number; emojis: Emojis; largo: Largo };
