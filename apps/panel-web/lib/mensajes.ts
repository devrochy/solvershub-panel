/**
 * Catálogo unificado de mensajes (ADR-0178, pista D0): lógica pura de la pantalla «Mensajes». La API solo lista
 * (`GET /mensajes/catalogo`); aquí se traduce lo que devuelve a lo que ve el dueño y se arma el enlace al editor
 * de origen de cada mensaje. Nada de esto decide permisos: eso lo hace el backend por sección.
 */
import type { FuenteDeMensaje, MensajeDelCatalogo, MensajeOmitido } from "@/lib/api/types";
import { canalLabel, habilidadLabel } from "@/lib/labels";

export type TipoDeMensaje = MensajeDelCatalogo["tipo"];

export const TIPOS: readonly TipoDeMensaje[] = ["meta", "evento", "opciones", "texto_pack", "guardado"];

const TIPO_LABEL: Record<TipoDeMensaje, string> = {
  meta: "Plantilla de WhatsApp",
  evento: "Aviso por evento",
  opciones: "Plantilla con opciones",
  texto_pack: "Texto de habilidad",
  guardado: "Mensaje guardado",
};

const TIPO_AYUDA: Record<TipoDeMensaje, string> = {
  meta: "Plantillas aprobadas por Meta para escribirle a un cliente fuera de las 24 horas.",
  evento: "Qué plantilla sale cuando pasa un evento (un cobro, una cita) y su texto de respaldo.",
  opciones: "Mensajes con botones que ejecutan una acción de tu asistente.",
  texto_pack: "Los textos que tus habilidades (agenda, suscripciones, comercio) le mandan al cliente.",
  guardado: "Respuestas rápidas que guardas para reutilizar en tus conversaciones.",
};

export function tipoLabel(tipo: string): string {
  return TIPO_LABEL[tipo as TipoDeMensaje] ?? tipo;
}

export function tipoAyuda(tipo: string): string {
  return TIPO_AYUDA[tipo as TipoDeMensaje] ?? "";
}

/** Pestañas del filtro: «Todos» y un tipo por cada uno que tenga mensajes o se pueda ver. */
export function tiposVisibles(mensajes: readonly MensajeDelCatalogo[], omitidas: readonly MensajeOmitido[]): TipoDeMensaje[] {
  const ocultos = new Set(omitidas.map((o) => o.tipo));
  return TIPOS.filter((t) => !ocultos.has(t) || mensajes.some((m) => m.tipo === t));
}

export function filtrarPorTipo(mensajes: readonly MensajeDelCatalogo[], tipo: string): MensajeDelCatalogo[] {
  return tipo === "todos" ? [...mensajes] : mensajes.filter((m) => m.tipo === tipo);
}

export function contarPorTipo(mensajes: readonly MensajeDelCatalogo[]): Record<string, number> {
  const cuentas: Record<string, number> = {};
  for (const m of mensajes) cuentas[m.tipo] = (cuentas[m.tipo] ?? 0) + 1;
  return cuentas;
}

// ------------------------------------------------------------------ estado
export type TonoDeEstado = "success" | "warning" | "danger" | "info" | "neutral";

const ESTADO_META: Record<string, [string, TonoDeEstado]> = {
  APPROVED: ["Aprobada", "success"],
  PENDING: ["En revisión", "info"],
  IN_APPEAL: ["En apelación", "info"],
  DRAFT: ["Borrador", "neutral"],
  REJECTED: ["Rechazada", "danger"],
  PAUSED: ["Pausada", "warning"],
  DISABLED: ["Desactivada", "danger"],
  FLAGGED: ["Marcada", "warning"],
  LIMIT_EXCEEDED: ["Límite excedido", "warning"],
  DELETED: ["Eliminada", "neutral"],
  PENDING_DELETION: ["Eliminándose", "neutral"],
  ARCHIVED: ["Archivada", "neutral"],
};

const ESTADO_PROPIO: Record<string, [string, TonoDeEstado]> = {
  // evento
  mapeado: ["Con plantilla", "success"],
  sin_mapear: ["Sin plantilla", "neutral"],
  plantilla_no_aprobada: ["Plantilla sin aprobar", "warning"],
  // opciones
  draft: ["Borrador", "neutral"],
  published: ["Activa", "success"],
  retired: ["Retirada", "warning"],
  // texto de habilidad
  por_defecto: ["Texto de fábrica", "neutral"],
  personalizado: ["Personalizado", "info"],
  config_invalida: ["Configuración inválida", "danger"],
  // mensaje guardado (`borrador` ya no choca: `draft` es de las plantillas con opciones)
  borrador: ["Borrador", "neutral"],
  activo: ["Activo", "success"],
  archivado: ["Archivado", "neutral"],
};

export function estadoDeMensaje(m: Pick<MensajeDelCatalogo, "tipo" | "estado">): { etiqueta: string; tono: TonoDeEstado } {
  const tabla = m.tipo === "meta" ? ESTADO_META : ESTADO_PROPIO;
  const hallado = tabla[m.estado];
  if (hallado) return { etiqueta: hallado[0], tono: hallado[1] };
  return { etiqueta: m.estado.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()), tono: "neutral" };
}

/** Una línea bajo el estado: categoría (Meta), plantilla mapeada (evento), estado en Meta (opciones) o la habilidad. */
export function detalleDeEstado(m: Pick<MensajeDelCatalogo, "tipo" | "estado_detalle">): string | null {
  if (!m.estado_detalle) return null;
  if (m.tipo === "meta") return `Categoría ${m.estado_detalle.toLowerCase()}`;
  if (m.tipo === "evento") return `Plantilla: ${m.estado_detalle}`;
  if (m.tipo === "opciones") return `En Meta: ${estadoDeMensaje({ tipo: "meta", estado: m.estado_detalle }).etiqueta.toLowerCase()}`;
  return m.estado_detalle;
}

// ------------------------------------------------------------------ canales y variables
export function canalesLabel(canales: readonly string[]): string {
  return canales.length === 0 ? "—" : canales.map((c) => (c === "email" ? "Correo" : canalLabel(c))).join(", ");
}

/** Nombre que se le muestra al dueño: la clave técnica de un evento o de un campo no se enseña sola. */
export function nombreDeMensaje(m: Pick<MensajeDelCatalogo, "tipo" | "nombre" | "clave" | "fuente">): string {
  if (m.tipo === "texto_pack" && m.fuente.plugin_id) return `${habilidadLabel(m.fuente.plugin_id)}: ${m.nombre}`;
  return m.nombre || m.clave;
}

// ------------------------------------------------------------------ enlace al editor
/** Editor de origen. Nulo si falta el dato para armarlo (no se inventa una ruta). */
export function enlaceAlEditor(fuente: FuenteDeMensaje): string | null {
  switch (fuente.editor) {
    case "meta":
      return fuente.connection_id ? `/conexiones/meta/${encodeURIComponent(fuente.connection_id)}/plantillas` : null;
    case "evento":
      return "/plantillas/eventos";
    case "opciones":
      return fuente.clave ? `/plantillas-opciones/${encodeURIComponent(fuente.clave)}` : null;
    case "texto_pack":
      return fuente.plugin_id ? `/habilidades/${encodeURIComponent(fuente.plugin_id)}` : null;
    default:
      // `guardado` todavía no tiene pantalla de edición en el panel: la fila queda sin enlace.
      return null;
  }
}

// ------------------------------------------------------------------ lo que no se muestra
export function motivoOmitido(o: MensajeOmitido): string {
  if (o.motivo === "bandera_apagada") {
    return `${tipoLabel(o.tipo)}: la función está desactivada en este negocio.`;
  }
  return `${tipoLabel(o.tipo)}: tu rol no tiene acceso a esa sección.`;
}
