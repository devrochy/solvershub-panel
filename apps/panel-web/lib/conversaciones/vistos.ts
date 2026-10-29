/**
 * Chats ya vistos en este dispositivo (bandeja de conversaciones).
 *
 * El backend calcula `pending_count` como «mensajes del cliente posteriores a la última
 * respuesta entregada» y solo lo limpia al responder. Para que la píldora desaparezca al abrir
 * el chat (lo que el equipo espera de una bandeja), se guarda aquí la última actividad vista
 * por dispositivo. La píldora vuelve cuando llega actividad más nueva que esa marca.
 */
export const CLAVE_VISTOS = "panel_conversaciones_vistos";
const LIMITE = 200;

export type Vistos = Record<string, string>;

type ChatConActividad = {
  id: string;
  last_message_at?: string | null;
  started_at: string;
};

/** Actividad del chat con el mismo criterio de orden de la bandeja. */
export function actividadDelChat(chat: ChatConActividad): string {
  return chat.last_message_at ?? chat.started_at;
}

/** JSON guardado, sin romper si el navegador no deja leer o el valor está corrupto. */
export function leerVistos(): Vistos {
  if (typeof window === "undefined") return {};
  try {
    const crudo = window.localStorage.getItem(CLAVE_VISTOS);
    if (!crudo) return {};
    const valor = JSON.parse(crudo) as unknown;
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).filter(
        (entrada): entrada is [string, string] => typeof entrada[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

/** Deja solo las marcas más recientes: el registro no crece sin fin. */
export function podarVistos(vistos: Vistos, limite = LIMITE): Vistos {
  const ordenados = Object.entries(vistos).sort((a, b) => b[1].localeCompare(a[1]));
  return Object.fromEntries(ordenados.slice(0, limite));
}

/** Marca el chat como visto en la actividad dada (no retrocede si ya había una más nueva). */
export function marcarVisto(vistos: Vistos, id: string, actividad: string): Vistos {
  const anterior = vistos[id];
  if (anterior && Date.parse(anterior) >= Date.parse(actividad)) return vistos;
  return podarVistos({ ...vistos, [id]: actividad });
}

/** ¿La actividad actual del chat ya se vio en este dispositivo? */
export function estaVisto(vistos: Vistos, chat: ChatConActividad): boolean {
  const marca = vistos[chat.id];
  if (!marca) return false;
  return Date.parse(marca) >= Date.parse(actividadDelChat(chat));
}

export function guardarVistos(vistos: Vistos): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_VISTOS, JSON.stringify(vistos));
  } catch {
    /* sin persistencia: la píldora vuelve en la próxima carga */
  }
}
