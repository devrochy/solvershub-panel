import type { components } from "@/lib/api/schema";

/**
 * Alta de Messenger (HU-CHAN-01, ADR-0152): reglas puras de presentación. Sin JSX ni fetch.
 * El panel nunca ve tokens: solo el `code` del popup (que viaja a la API) y las Páginas que ella
 * describe.
 */

export type EstadoMessenger = components["schemas"]["MessengerState"];
export type PaginaDescubierta = components["schemas"]["PageOut"];
export type ResultadoConexion = components["schemas"]["ConnectOut"];

export type BloqueoDelAlta = { titulo: string; texto: string };

/** Por qué no se puede empezar el alta en este entorno o con este plan; `null` si se puede. */
export function bloqueoDelAlta(estado: Pick<EstadoMessenger, "plan_includes" | "meta_configured">): BloqueoDelAlta | null {
  if (!estado.plan_includes) {
    return {
      titulo: "Tu plan no incluye Messenger",
      texto: "Messenger está en los planes de pago. Cambia de plan para conectar la Página de tu negocio.",
    };
  }
  if (!estado.meta_configured) {
    return {
      titulo: "Conectar con Facebook no está disponible en este entorno",
      texto: "Falta configurar la app de Meta de la plataforma para Messenger.",
    };
  }
  return null;
}

/** Páginas que se pueden marcar: cumplen los roles y no están ya conectadas a este negocio. */
export function esSeleccionable(p: Pick<PaginaDescubierta, "eligible" | "already_connected">): boolean {
  return p.eligible && !p.already_connected;
}

/** Selección inicial: todas las que se pueden conectar. */
export function seleccionInicial(paginas: PaginaDescubierta[]): string[] {
  return paginas.filter(esSeleccionable).map((p) => p.page_id);
}

/** Por qué una Página no se puede marcar, o `null` si sí. */
export function motivoNoSeleccionable(p: PaginaDescubierta): string | null {
  if (p.already_connected) return "Ya está conectada a este negocio.";
  if (!p.eligible) return p.reason ?? "No cumples los roles que pide Meta para esta Página.";
  return null;
}

/** El `code` de `FB.login`, o `""` si el usuario cerró el popup sin autorizar. */
export function codeDeLogin(response: { authResponse?: { code?: string } | null } | null | undefined): string {
  return response?.authResponse?.code?.trim() ?? "";
}

export type ResumenConexion = {
  conectadas: ResultadoConexion["connected"];
  /** Guardadas, pero Meta no confirmó la suscripción: no reciben mensajes hasta reintentar. */
  sinSuscripcion: ResultadoConexion["connected"];
  omitidas: ResultadoConexion["skipped"];
  /** ¿Quedó al menos una Página recibiendo mensajes? */
  recibiendo: boolean;
};

export function resumirConexion(r: ResultadoConexion): ResumenConexion {
  const sinSuscripcion = r.connected.filter((p) => !p.subscribed);
  return {
    conectadas: r.connected,
    sinSuscripcion,
    omitidas: r.skipped,
    recibiendo: r.connected.some((p) => p.subscribed),
  };
}

/** Texto de una Página en el resultado: su nombre si se conoce, si no el ID. */
export function nombreDePagina(pageId: string, paginas: PaginaDescubierta[]): string {
  return paginas.find((p) => p.page_id === pageId)?.name || `Página ${pageId}`;
}
