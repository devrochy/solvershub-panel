/**
 * Probar plantillas con opciones en el playground, sin Meta (SPEC-40, ADR-0172, pista B2): lógica pura.
 * El mensaje del backend trae `interactive` con la forma del mensaje interactivo de WhatsApp que arma
 * `kernel/opciones/mapeo.a_interactivo` (`body` en texto, `buttons` o `button` + `rows`, con los ids firmados
 * que `POST /tap` recibe). Aquí solo se lee, se valida y se explica el resultado del toque en español.
 */
import type { PlaygroundMensaje } from "@/lib/api/types";
import { CODIGO_BANDERA_APAGADA, type ErrorDeApi } from "@/lib/plantillas-opciones";

export type OpcionDelMensaje = { id: string; titulo: string };

export type InteractivoLeido = {
  tipo: "botones" | "lista";
  cuerpo: string;
  pie: string | null;
  /** Texto del botón que abre la lista (solo `lista`). */
  boton: string | null;
  opciones: OpcionDelMensaje[];
};

/** Un botón de plantilla con opciones: `opt:`, `optc:` (confirmar) o `optn:` (cancelar), como `payload.es_de_opciones`. */
const PAYLOAD = /^(opt|optc|optn):[^\s]{1,250}$/;

export const esPayloadDeOpciones = (valor: unknown): valor is string => typeof valor === "string" && valor.length <= 256 && PAYLOAD.test(valor);

function esObjeto(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function leerOpciones(v: unknown): OpcionDelMensaje[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((o) => (esObjeto(o) && typeof o.id === "string" && typeof o.title === "string" ? [{ id: o.id, titulo: o.title }] : []));
}

/** `null` si el mensaje no es interactivo o no tiene opciones tocables (se pinta como texto). */
export function leerInteractivo(interactive: PlaygroundMensaje["interactive"] | undefined): InteractivoLeido | null {
  if (!esObjeto(interactive)) return null;
  const lista = interactive.type === "list";
  const opciones = leerOpciones(lista ? interactive.rows : interactive.buttons);
  if (opciones.length === 0) return null;
  return {
    tipo: lista ? "lista" : "botones",
    cuerpo: typeof interactive.body === "string" ? interactive.body : "",
    pie: typeof interactive.footer === "string" && interactive.footer ? interactive.footer : null,
    boton: lista && typeof interactive.button === "string" ? interactive.button : null,
    opciones,
  };
}

export type Tono = "info" | "warning" | "danger";
export type AvisoDeToque = { tono: Tono; texto: string };

/**
 * Qué explicarle al dueño de un toque. `null` cuando salió bien y el resultado ya se ve en el chat (`ok` con
 * mensajes, o la petición de confirmación, que trae sus propios botones). Un `ok` sin mensajes o cualquier
 * `outcome` descartado nunca queda en silencio.
 */
export function avisoDeToque(outcome: string, mensajes: number): AvisoDeToque | null {
  switch (outcome) {
    case "ok":
      return mensajes > 0 ? null : { tono: "info", texto: "La acción se ejecutó, pero la plantilla no tiene una respuesta para mostrar." };
    case "confirm_requested":
      return mensajes > 0 ? null : { tono: "info", texto: "Se pidió confirmar la acción." };
    case "tool_error":
      return { tono: "danger", texto: "La acción falló al ejecutarse. El cliente de prueba recibe el mensaje de error de la plantilla; la causa está en el registro de auditoría." };
    case "denied":
      return { tono: "warning", texto: "El agente no tiene permiso para ejecutar esa acción: revisa que la habilidad esté habilitada y con binding en Configuración → Habilidades." };
    case "args_drift":
      return { tono: "warning", texto: "Los datos cambiaron desde que se envió el mensaje, así que la acción no se ejecutó. Envía la plantilla de nuevo." };
    case "cancelled":
      return { tono: "info", texto: "Cancelaste la acción: no se ejecutó nada." };
    case "expired":
      return { tono: "warning", texto: "Esa opción ya venció. Envía la plantilla de nuevo para volver a probar." };
    case "retired":
      return { tono: "warning", texto: "La plantilla se retiró y ya no ejecuta acciones. Publícala de nuevo." };
    case "duplicate":
      return { tono: "info", texto: "Esa opción ya se usó (cada envío ejecuta una sola vez). Envía la plantilla de nuevo para volver a probar." };
    case "in_progress":
      return { tono: "info", texto: "La acción todavía se está ejecutando. Espera unos segundos y revisa el chat." };
    case "unconfirmed":
      return { tono: "warning", texto: "Falta confirmar la acción: toca «Confirmar» en el mensaje de confirmación." };
    case "bad_signature":
    case "unknown_send":
    case "foreign_conversation":
      return { tono: "warning", texto: "El botón se descartó: no corresponde a esta conversación o fue modificado. No se ejecutó nada." };
    default:
      return { tono: "danger", texto: "No se pudo atender el toque. Inténtalo de nuevo; si sigue igual, revisa el registro del servidor." };
  }
}

/** Texto claro de un fallo de `/options` o `/tap` (404, 403, 409, 422 y 5xx de la API), con qué hacer después. */
export function mensajeDeErrorPlayground(e: Pick<ErrorDeApi, "status" | "code" | "mensaje">): string {
  if (e.status === 404 && e.code === CODIGO_BANDERA_APAGADA) {
    return "Las plantillas con opciones no están activadas en este negocio, así que no se pueden enviar ni tocar. Las activa un master desde Tenants → Acciones.";
  }
  if (e.status === 401) return "Tu sesión venció. Vuelve a entrar.";
  if (e.status === 403) return "Solo el propietario o un master con permiso de escritura en Conexiones puede probar plantillas con opciones.";
  switch (e.code) {
    case "not_found":
      return "La plantilla ya no existe. Actualiza la lista y elige otra.";
    case "no_publicada":
      return "Publica la plantilla antes de probarla: solo se envía la versión publicada.";
    case "pausada":
      return "El asistente está en pausa y no envía mensajes. Reactívalo y vuelve a intentar.";
    case "contexto_incompleto":
      return "Faltan datos del cliente de prueba para armar el mensaje (por ejemplo su nombre).";
    case "payload_invalido":
      return "Ese botón no es de una plantilla con opciones.";
    case "conversacion_no_encontrada":
      return "No existe la conversación de prueba. Reinicia la prueba y envía la plantilla de nuevo.";
    case "invalid_connection":
      return "La conexión elegida no sirve para probar. Elige otra.";
    default:
      return e.status >= 500 || e.status === 0 ? "No se pudo completar la prueba. Inténtalo de nuevo en unos minutos." : e.mensaje;
  }
}
