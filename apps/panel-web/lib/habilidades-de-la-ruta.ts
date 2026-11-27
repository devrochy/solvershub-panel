/**
 * Estación 2 · Habilidades de la ruta de lanzamiento, una pregunta a la vez (HU-UX-28, SPEC-52, tablero `E2-H`):
 * lógica pura de las tres preguntas («¿Qué hará…?», «¿Cómo te pagan…?» y las frases) y de sus «Opciones
 * avanzadas». Las tools HTTP no entran a la ruta: viven solo en Personalizar (decisión del dueño, 2026-11-26).
 */
import { borradorDesde, type Borrador, type FormasDePago, type Metodo } from "@/lib/formas-de-pago";
import { enPalabras, type HorarioDelAgente } from "@/lib/horario-del-agente";
import type { TipoDeNegocio } from "@/lib/onboarding";

/** La línea visible de «Opciones avanzadas» de la estación 2 (decisión del dueño, 2026-11-26). */
export const AVANZADAS_DE_HABILIDADES = "Acciones, límites por acción y horario.";

/** La pregunta de las frases: en Agenda los clientes piden una cita. */
export function tituloDeLasFrases(tipo: TipoDeNegocio | null | undefined): string {
  return tipo === "agenda" ? "¿Así te piden una cita?" : "¿Así te escriben tus clientes?";
}

/** La bajada de la estación: cuántas preguntas tiene (dos sin Comercio, tres con él). */
export function bajadaDeHabilidades(preguntas: number): string {
  return `${preguntas === 2 ? "Dos" : "Tres"} preguntas. Lo técnico queda para después.`;
}

/**
 * El horario con que atiende el agente, solo para leer: el propio si lo tiene; si no, el del negocio. Sin
 * respuesta de la API usa el horario del negocio de Configuración (`negocio.horario`).
 */
export function lineaDelHorario(horario: HorarioDelAgente | null | undefined, delNegocio: string | null): string {
  if (horario?.source === "agente") return `Atiende en su propio horario: ${enPalabras(horario.schedule)}`;
  const delNegocioEnPalabras = horario ? enPalabras(horario.business_hours) : delNegocio;
  return `Atiende en el horario del negocio: ${delNegocioEnPalabras || "sin horario definido"}`;
}

/** Qué formas de pago están encendidas. */
export type FormasElegidas = Partial<Record<Metodo, boolean>>;

export function elegidasDe(formas: FormasDePago): FormasElegidas {
  return Object.fromEntries(formas.forms.map((f) => [f.method, f.enabled]));
}

/**
 * El cuerpo de `PUT payment-forms` con lo elegido en la pregunta: el mismo de Personalizar, con las
 * instrucciones, las cuentas y el comprobante como estaban (esos se ajustan en Personalizar).
 */
export function cuerpoDeFormas(formas: FormasDePago, elegidas: FormasElegidas): Borrador {
  const base = borradorDesde(formas);
  return { ...base, forms: base.forms.map((f) => ({ ...f, enabled: elegidas[f.method] ?? f.enabled })) };
}

/** Si lo elegido cambió frente a lo guardado (si no, no se llama a la API). */
export function formasCambiaron(formas: FormasDePago, elegidas: FormasElegidas): boolean {
  return formas.forms.some((f) => (elegidas[f.method] ?? f.enabled) !== f.enabled);
}
