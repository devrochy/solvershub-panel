/**
 * Etiquetas legibles en español (HU-UI-02). Fuente única para estados,
 * canales, roles, motivos de escalación y claves de permisos: ninguna vista
 * muestra el enum crudo.
 */

export const CANAL: Record<string, string> = {
  whatsapp: "WhatsApp",
  whatsapp_cloud: "WhatsApp Cloud",
  whatsapp_waweb: "WhatsApp Web (QR)",
  instagram: "Instagram",
  messenger: "Messenger",
  facebook: "Facebook",
  email: "Correo",
  sms: "SMS",
  webchat: "Chat web",
  web: "Web",
};

export const CITA: Record<string, string> = {
  scheduled: "Agendada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
  tentative: "Provisional",
  pending: "Pendiente",
};

export const ROL: Record<string, string> = {
  master: "Master",
  owner: "Dueño",
  propietario: "Propietario",
  gestor: "Gestor",
  colaborador: "Colaborador",
  tester: "Tester",
};

/**
 * Motivos de escalación (HU-UX-17). Las claves son los códigos cerrados que expone la API
 * (`reason_code`); la API ya manda `reason_label`, y este catálogo es el respaldo.
 */
export const ESCALACION: Record<string, string> = {
  solicitud_cliente: "Solicitud del cliente",
  queja: "Queja",
  fuera_de_alcance: "Fuera de alcance",
  intentos_fallidos: "Intentos fallidos",
  monto_alto: "Monto alto",
  palabra_clave: "Pidió hablar con una persona",
  accion_habilidad: "Acción de una habilidad",
  regla_negocio: "Regla del negocio",
  verificacion: "Respuesta no verificada",
  frase_prohibida: "Frase prohibida por la personalidad",
  falla_ia: "Falla del asistente de IA",
  rechazo_ia: "El asistente no pudo responder",
  envio_fallido: "No se pudo enviar el mensaje",
  sin_resolver: "Varios turnos sin resolver",
  limite_iteraciones: "El asistente no llegó a una respuesta",
  otro: "Otro",
};

/** Motivos crudos que guarda el sistema y su código (respaldo si la API no manda `reason_code`). */
const ESCALACION_CRUDO: Record<string, string> = {
  keyword: "palabra_clave",
  llm_error: "falla_ia",
  llm_refusal: "rechazo_ia",
  persona_forbidden_phrase: "frase_prohibida",
  send_failed: "envio_fallido",
  turns_unresolved: "sin_resolver",
  max_iterations: "limite_iteraciones",
  guardrail: "verificacion",
};

/** Motivos que el modelo puede elegir en `escalate_to_human`. */
const ESCALACION_DE_TOOL = new Set([
  "solicitud_cliente",
  "queja",
  "fuera_de_alcance",
  "intentos_fallidos",
  "monto_alto",
]);

/** Motivos de riesgo (como en agent-sale: cliente molesto o venta grande): tono de advertencia. */
export const ESCALACION_RIESGO = new Set(["queja", "monto_alto"]);

export const SECCION: Record<string, string> = {
  "pack_cobranza:suscripciones": "Suscripciones",
  "pack_cobranza:carteras": "Carteras",
  "pack_cobranza:clientes": "Clientes",
  "pack_cobranza:pagos": "Pagos",
  "pack_cobranza:auditoria": "Auditoría",
  "pack_commerce:pedidos": "Pedidos",
  "pack_commerce:catalogo": "Catálogo",
  "pack_calendar:agenda": "Agenda",
  conexiones: "Conexiones",
  colaboradores: "Colaboradores",
  conversaciones: "Conversaciones",
  configuracion: "Configuración",
  // Claves reales de permisos del core (`/admin/me` → `permissions`).
  agents: "Agentes",
  collaborators: "Colaboradores",
  connections: "Conexiones",
  conversations: "Conversaciones",
  costs: "Costos LLM",
  dashboard: "Resumen",
  escalations: "Escalaciones",
  leads: "Clientes",
  plan: "Plan y consumo",
  plugins: "Habilidades",
  settings: "Configuración",
  tenants: "Negocios",
  qa: "Pruebas",
  pack_commerce: "Comercio",
  "pack_subscriptions:suscripciones": "Suscripciones",
};

/** Nombre visible de cada pack, para las secciones `pack_<x>:<sección>` sin etiqueta propia. */
const PACK: Record<string, string> = {
  pack_calendar: "Calendario",
  pack_cobranza: "Cobranza",
  pack_commerce: "Comercio",
  pack_subscriptions: "Suscripciones",
};

/** Secciones de packs con tilde o nombre distinto de la clave. */
const SUBSECCION: Record<string, string> = {
  auditoria: "Auditoría",
  conexion: "Conexión",
  configuracion: "Configuración",
  tipos: "Tipos de cita",
};

function capitalizar(texto: string): string {
  const limpio = texto.replace(/[_-]+/g, " ").trim();
  if (!limpio) return texto;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Etiqueta de canal (fallback: el id tal cual). */
export function canalLabel(id: string | null | undefined): string {
  return (id && CANAL[id]) || id || "Canal";
}

/** Etiqueta de estado de cita (fallback: capitalizado). */
export function citaLabel(estado: string | null | undefined): string {
  return (estado && CITA[estado]) || capitalizar(estado ?? "");
}

/** Etiqueta de rol (fallback: capitalizado). */
export function rolLabel(rol: string | null | undefined): string {
  return (rol && ROL[rol]) || capitalizar(rol ?? "");
}

/** Código cerrado de un motivo crudo (`Escalation.reason`), igual que el backend. */
export function escalacionCodigo(motivo: string | null | undefined): string {
  if (!motivo) return "otro";
  if (ESCALACION_CRUDO[motivo]) return ESCALACION_CRUDO[motivo];
  if (motivo.startsWith("tool:")) {
    const codigo = motivo.slice("tool:".length);
    return ESCALACION_DE_TOOL.has(codigo) ? codigo : "otro";
  }
  if (motivo.startsWith("plugin:")) return "accion_habilidad";
  if (motivo.startsWith("regla:")) return "regla_negocio";
  if (motivo.includes(": ")) return "verificacion";
  return "otro";
}

/**
 * Etiqueta de un motivo de escalación crudo, de respaldo cuando la API no manda
 * `reason_label`. `tool:<código>` usa la etiqueta del código (el texto libre de antes
 * queda como «Otro») y `plugin:<tool>` se lee como «Acción de <tool>».
 */
export function escalacionLabel(motivo: string | null | undefined): string {
  if (!motivo) return "Sin motivo";
  if (motivo.startsWith("plugin:")) {
    const tool = capitalizar(motivo.slice("plugin:".length));
    return tool ? `Acción de ${tool}` : ESCALACION.accion_habilidad;
  }
  return ESCALACION[escalacionCodigo(motivo)];
}

/** Etiqueta de clave de permiso/sección (fallback: humanizada). */
export function seccionLabel(clave: string | null | undefined): string {
  if (!clave) return "Sin sección";
  if (SECCION[clave]) return SECCION[clave];
  const match = /^(pack_[a-z]+):(.+)$/.exec(clave);
  if (!match) return capitalizar(clave);
  const [, pack, seccion] = match;
  const nombre = SUBSECCION[seccion] ?? capitalizar(seccion);
  return PACK[pack] ? `${PACK[pack]} · ${nombre}` : nombre;
}

/** Estado de un número en Meta (`status` de `GET /{waba}/phone_numbers`). */
export const ESTADO_NUMERO_META: Record<string, string> = {
  CONNECTED: "Conectado",
  PENDING: "Pendiente",
  DISCONNECTED: "Desconectado",
  DELETED: "Eliminado",
  BANNED: "Bloqueado",
  FLAGGED: "Marcado",
  RESTRICTED: "Restringido",
  RATE_LIMITED: "Con límite de envío",
  MIGRATED: "Migrado",
  UNVERIFIED: "Sin verificar",
  UNKNOWN: "Desconocido",
};

/** Verificación del número por código (`code_verification_status`). */
export const VERIFICACION_NUMERO: Record<string, string> = {
  VERIFIED: "Verificado",
  NOT_VERIFIED: "Sin verificar",
  EXPIRED: "Código vencido",
};

/** Calidad del número (`quality_rating`). */
export const CALIDAD_NUMERO: Record<string, string> = {
  GREEN: "Alta",
  YELLOW: "Media",
  RED: "Baja",
  UNKNOWN: "Sin datos",
  NA: "Sin datos",
};

/** Etiqueta del estado de un número de Meta (fallback: capitalizado; vacío: "Sin dato"). */
export function estadoNumeroMetaLabel(estado: string | null | undefined): string {
  if (!estado) return "Sin dato";
  return ESTADO_NUMERO_META[estado] ?? capitalizar(estado.toLowerCase());
}

/** Etiqueta de la verificación por código de un número. */
export function verificacionNumeroLabel(estado: string | null | undefined): string {
  if (!estado) return "Sin dato";
  return VERIFICACION_NUMERO[estado] ?? capitalizar(estado.toLowerCase());
}

/** Etiqueta de la calidad de un número. */
export function calidadNumeroLabel(calidad: string | null | undefined): string {
  if (!calidad) return "Sin datos";
  return CALIDAD_NUMERO[calidad] ?? capitalizar(calidad.toLowerCase());
}

/** Estado de un primer paso del onboarding (HU-SH-06). */
export const ESTADO_PASO: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completo: "Listo",
};

export function estadoPasoLabel(estado: string | null | undefined): string {
  if (!estado) return "Pendiente";
  return ESTADO_PASO[estado] ?? capitalizar(estado);
}

/** Nombre visible de una habilidad (`pack_commerce` → «Comercio»), para no mostrar ids. */
export function habilidadLabel(id: string): string {
  return PACK[id] ?? capitalizar(id.replace(/^pack_/, ""));
}
