/**
 * Embedded Signup de WhatsApp (HU-SH-05, ADR-0080): lo que el panel lee del popup de Meta.
 *
 * Forma vigente (Embedded Signup v4, verificada contra la documentación de Meta el 2026-10-09):
 * `FB.login` con `config_id`, `response_type: "code"`, `override_default_response_type: true` y
 * `extras: { setup: {} }` (v4 ya no usa `sessionInfoVersion` ni `featureType`). El resultado
 * llega por `postMessage` desde facebook.com con `type: "WA_EMBEDDED_SIGNUP"`:
 *
 * - `FINISH` / `FINISH_ONLY_WABA` / `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` con
 *   `data.phone_number_id`, `data.waba_id` y `data.business_id`;
 * - `CANCEL` con `data.current_step` (lo cerró) o con `data.error_message`, `error_code`,
 *   `session_id` (Meta reportó un error). `ERROR` (versiones viejas) se trata igual.
 *
 * Todo lo que llega del evento es dato: el servidor verifica la WABA y el número con el token.
 */

export const FINISH_EVENTS = ["FINISH", "FINISH_ONLY_WABA", "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"] as const;

export type FinishEvent = {
  kind: "finish";
  eventType: string;
  wabaId: string;
  phoneNumberId: string;
  businessId: string;
};

export type CancelEvent = {
  kind: "cancel";
  currentStep?: string;
  errorMessage?: string;
  errorCode?: string;
  sessionId?: string;
};

export type SignupEvent = FinishEvent | CancelEvent;

/**
 * ¿El mensaje viene de Facebook? Compara el host, no el texto: `endsWith("facebook.com")`
 * (el ejemplo de Meta) también aceptaría `evilfacebook.com`.
 */
export function esOrigenDeFacebook(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && (host === "facebook.com" || host.endsWith(".facebook.com"));
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function texto(value: unknown, max = 300): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const limpio = String(value).trim().slice(0, max);
  return limpio || undefined;
}

function id(value: unknown): string {
  const v = texto(value, 64) ?? "";
  return ID.test(v) ? v : "";
}

/** Evento del popup, o `null` si el mensaje no es de Embedded Signup (u otro evento). */
export function parseSignupEvent(raw: unknown): SignupEvent | null {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const msg = data as { type?: unknown; event?: unknown; data?: unknown };
  if (msg.type !== "WA_EMBEDDED_SIGNUP") return null;
  const evento = typeof msg.event === "string" ? msg.event : "";
  const payload = (msg.data && typeof msg.data === "object" ? msg.data : {}) as Record<string, unknown>;

  if ((FINISH_EVENTS as readonly string[]).includes(evento)) {
    return {
      kind: "finish",
      eventType: evento,
      wabaId: id(payload.waba_id),
      phoneNumberId: id(payload.phone_number_id),
      businessId: id(payload.business_id),
    };
  }
  if (evento === "CANCEL" || evento === "ERROR") {
    return {
      kind: "cancel",
      currentStep: texto(payload.current_step, 200),
      errorMessage: texto(payload.error_message, 1000),
      errorCode: texto(payload.error_code, 100),
      sessionId: texto(payload.session_id, 200),
    };
  }
  return null;
}

/** Nombre de cada paso del alta, para "en qué paso quedó". */
const PASOS: Record<string, string> = {
  select_channel: "Conectar con Facebook",
  launch_oauth: "Conectar con Facebook",
  exchange_code: "Conectar con Facebook",
  discover_assets: "Leer la cuenta y el número",
  select_assets: "Leer la cuenta y el número",
  subscribe_webhook: "Suscribir la cuenta de WhatsApp",
  register_number: "Registrar el número con su PIN",
  sync_templates: "Sincronizar plantillas",
  verify_health: "Verificar la conexión",
  done: "Listo",
};

export function nombrePaso(step: string): string {
  return PASOS[step] ?? step;
}

/** Pasos que ve el usuario, en orden, para la línea de progreso. */
export const PASOS_VISIBLES: { key: string; label: string; steps: string[] }[] = [
  { key: "facebook", label: "Conectar con Facebook", steps: ["select_channel", "launch_oauth", "exchange_code"] },
  { key: "cuenta", label: "Cuenta y número", steps: ["discover_assets", "select_assets", "subscribe_webhook"] },
  { key: "registro", label: "Registrar el número", steps: ["register_number"] },
  { key: "plantillas", label: "Plantillas", steps: ["sync_templates"] },
  { key: "salud", label: "Verificar", steps: ["verify_health", "done"] },
];

export type EstadoPaso = "hecho" | "actual" | "pendiente";

export function estadoPasos(step: string): { key: string; label: string; estado: EstadoPaso }[] {
  const actual = PASOS_VISIBLES.findIndex((p) => p.steps.includes(step));
  return PASOS_VISIBLES.map((p, i) => ({
    key: p.key,
    label: p.label,
    estado: step === "done" || i < actual ? "hecho" : i === actual ? "actual" : "pendiente",
  }));
}

/**
 * Junta el `code` de `FB.login` y el evento `FINISH` del popup, que llegan en cualquier orden.
 * Con el `code` se espera el evento hasta `esperaMs` (el `code` vence a los 30 s): si no llega,
 * se canjea igual y el servidor usa lo que ya sabe. Llama a `onListo` una sola vez.
 */
export class CanjePendiente {
  private code: string | null = null;
  private finish: FinishEvent | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listo = false;

  constructor(
    private readonly onListo: (code: string, finish: FinishEvent | null) => void,
    private readonly esperaMs = 3000,
  ) {}

  conCode(code: string): void {
    if (this.listo || !code) return;
    this.code = code;
    if (this.finish) this.disparar();
    else this.timer = setTimeout(() => this.disparar(), this.esperaMs);
  }

  conFinish(evento: FinishEvent): void {
    if (this.listo) return;
    this.finish = evento;
    if (this.code) this.disparar();
  }

  cancelar(): void {
    this.listo = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private disparar(): void {
    if (this.listo || !this.code) return;
    this.listo = true;
    if (this.timer) clearTimeout(this.timer);
    this.onListo(this.code, this.finish);
  }
}
