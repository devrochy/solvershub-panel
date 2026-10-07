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
};

export const ESCALACION: Record<string, string> = {
  send_failed: "Fallo al enviar",
  turns_unresolved: "Turnos sin resolver",
  guardrail: "Guardrail de seguridad",
  max_iterations: "Límite de turnos",
  manual: "Solicitud manual",
};

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

/** Etiqueta de motivo de escalación; los motivos `tool:<x>` se leen como "Solicitud manual". */
export function escalacionLabel(motivo: string | null | undefined): string {
  if (!motivo) return "Sin motivo";
  if (motivo.startsWith("tool:")) return "Solicitud manual";
  return ESCALACION[motivo] ?? capitalizar(motivo);
}

/** Etiqueta de clave de permiso/sección (fallback: humanizada). */
export function seccionLabel(clave: string | null | undefined): string {
  if (!clave) return "Sin sección";
  if (SECCION[clave]) return SECCION[clave];
  const sinPack = clave.replace(/^pack_[a-z]+:/, "");
  return capitalizar(sinPack);
}
