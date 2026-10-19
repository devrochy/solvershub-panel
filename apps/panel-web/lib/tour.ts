/**
 * Recorrido guiado del panel (HU-SH-06; D-SPEC-12-1 = A: tour propio, liviano, con los
 * componentes del panel). Cinco pasos que señalan dónde se resuelve cada primer paso.
 *
 * `objetivo` es el valor de `data-tour` del elemento que se resalta (la tarjeta de primeros
 * pasos o un enlace del menú, que lleva su `href`). Si no está visible (sin permiso, en el
 * celular), el paso se lee igual: el texto no depende del resaltado.
 */

export interface PasoDelTour {
  id: string;
  titulo: string;
  texto: string;
  objetivo: string | null;
}

export const PASOS_DEL_TOUR: readonly PasoDelTour[] = [
  {
    id: "primeros-pasos",
    titulo: "Tus primeros pasos",
    texto:
      "Aquí ves lo que falta para dejar tu asistente listo. Cada paso se marca solo cuando lo completas.",
    objetivo: "primeros-pasos",
  },
  {
    id: "conexiones",
    titulo: "Conecta tu WhatsApp",
    texto: "En Conexiones vinculas el WhatsApp de tu negocio: tu asistente atiende a tus clientes por ahí.",
    objetivo: "/conexiones",
  },
  {
    id: "habilidades",
    titulo: "Lo que sabe hacer tu asistente",
    texto: "En Configuración › Habilidades activas y configuras lo que hace: vender, agendar o cobrar.",
    objetivo: "/configuracion",
  },
  {
    id: "probar",
    titulo: "Pruébalo antes de abrirlo",
    texto:
      "En Agentes › Probar asistente conversas con él como si fueras un cliente, sin enviar nada por WhatsApp.",
    objetivo: "/agentes",
  },
  {
    id: "conversaciones",
    titulo: "Atiende cuando haga falta",
    texto:
      "En Conversaciones ves cada chat y puedes tomar el control. Si una sección no es clara, pulsa «¿Qué es esto?».",
    objetivo: "/conversaciones",
  },
];

/** Cookie no secreta: el recorrido ya se hizo o se saltó (se lee en el servidor, sin parpadeo). */
export const TOUR_COOKIE = "panel_tour";

export type FinDelTour = "completado" | "saltado";

/** Se ofrece en la primera visita mientras queden primeros pasos. */
export function debeOfrecerTour(cookie: string | null | undefined, hayPasosPendientes: boolean): boolean {
  return hayPasosPendientes && cookie !== "completado" && cookie !== "saltado";
}

export function cookieDelTour(fin: FinDelTour): string {
  return `${TOUR_COOKIE}=${fin}; path=/; max-age=31536000; samesite=lax`;
}

/** Índice siguiente; null al pasar del último (el recorrido termina). */
export function pasoSiguiente(actual: number, total: number): number | null {
  return actual + 1 < total ? actual + 1 : null;
}

export function pasoAnterior(actual: number): number {
  return Math.max(0, actual - 1);
}

/** Texto para el lector de pantalla al cambiar de paso. */
export function anuncioDelPaso(indice: number, total: number, titulo: string): string {
  return `Paso ${indice + 1} de ${total}: ${titulo}`;
}
