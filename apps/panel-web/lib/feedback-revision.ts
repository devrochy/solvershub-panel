/**
 * Bandeja de reportes de clientes para el equipo de SolversHub (SPEC-54, HU-FB-06, ADR-0213).
 *
 * Ver la bandeja: quien actúa como master (master, o tester en test). Tomar, aprobar y rechazar: solo
 * `role === "master"`; el tester recibe 403 del servidor, así que el panel ni le ofrece las acciones.
 */
import type { StatusMap } from "@/components/domain/status-badge";
import type { FeedbackAprobarIn, FeedbackRechazarIn } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";

type ConRol = { role?: string | null } | null | undefined;

/** Ver la bandeja y el detalle (`actua_como_master` del core). */
export function veBandejaDeReportes(me: ConRol): boolean {
  return me?.role === "master" || me?.role === "tester";
}

/** Tomar, aprobar y rechazar (`role == "master"` estricto, ADR-0213 §8). */
export function decideReportes(me: ConRol): boolean {
  return me?.role === "master";
}

export const ESTADOS_DE_REPORTE = ["recibido", "en_revision", "aprobado", "rechazado"] as const;
export const TIPOS_DE_REPORTE = ["error", "mejora", "idea"] as const;
export const MOTIVOS_DE_RECHAZO = ["duplicado", "no_reproducible", "fuera_de_alcance", "informacion_insuficiente", "otro"] as const;

export type EstadoDeReporte = (typeof ESTADOS_DE_REPORTE)[number];
export type TipoDeReporte = (typeof TIPOS_DE_REPORTE)[number];
export type MotivoDeRechazo = (typeof MOTIVOS_DE_RECHAZO)[number];

export const FEEDBACK_STATUS: StatusMap = {
  recibido: { label: "Recibido", variant: "warning" },
  en_revision: { label: "En revisión", variant: "accent" },
  aprobado: { label: "Aprobado", variant: "success" },
  rechazado: { label: "Rechazado", variant: "neutral" },
};

export const TIPO_LABEL: Record<TipoDeReporte, string> = { error: "Error", mejora: "Mejora", idea: "Idea" };

export const MOTIVO_LABEL: Record<MotivoDeRechazo, string> = {
  duplicado: "Duplicado",
  no_reproducible: "No se pudo reproducir",
  fuera_de_alcance: "Fuera de alcance",
  informacion_insuficiente: "Falta información",
  otro: "Otro",
};

/**
 * Topes de la bonificación (ADR-0213 §4: `FEEDBACK_CREDITOS_MAX_REPORTE` y `FEEDBACK_CREDITOS_MAX_MES_NEGOCIO`).
 * La API no los expone: estos son los valores por defecto del core y sirven de guía en el modal. La fuente
 * autoritativa es el 422 del servidor, que trae el máximo y lo disponible en `details`.
 */
export const TOPE_POR_REPORTE = 5000;
export const TOPE_MENSUAL_POR_NEGOCIO = 10000;

export const LIMITE_DE_LA_BANDEJA = 25;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID.test(valor);
}

export type FiltrosDeBandeja = { estado?: string; tipo?: string; tenant_id?: string; cursor?: string };

/**
 * Consulta de la bandeja para la API: solo los filtros válidos (los enums, un UUID de negocio y un cursor
 * acotado). Lo demás se descarta, así un enlace manipulado no llega al backend.
 */
export function consultaDeBandeja(sp: FiltrosDeBandeja, limit = LIMITE_DE_LA_BANDEJA): string {
  const qs = new URLSearchParams();
  if (sp.estado && (ESTADOS_DE_REPORTE as readonly string[]).includes(sp.estado)) qs.set("estado", sp.estado);
  if (sp.tipo && (TIPOS_DE_REPORTE as readonly string[]).includes(sp.tipo)) qs.set("tipo", sp.tipo);
  if (esUuid(sp.tenant_id)) qs.set("tenant_id", sp.tenant_id);
  if (sp.cursor && sp.cursor.length <= 200 && /^[A-Za-z0-9_=-]+$/.test(sp.cursor)) qs.set("cursor", sp.cursor);
  qs.set("limit", String(Math.min(50, Math.max(1, Math.trunc(limit) || LIMITE_DE_LA_BANDEJA))));
  return `?${qs.toString()}`;
}

/** Enlace de la bandeja con los filtros dados (sin cursor: cambiar un filtro vuelve a la primera página). */
export function enlaceDeBandeja(sp: FiltrosDeBandeja, cambio: Partial<FiltrosDeBandeja> = {}): string {
  const todo = { ...sp, cursor: undefined, ...cambio };
  const qs = new URLSearchParams();
  for (const clave of ["estado", "tipo", "tenant_id", "cursor"] as const) {
    const v = todo[clave];
    if (v) qs.set(clave, v);
  }
  return `/plataforma/feedback${qs.size ? `?${qs.toString()}` : ""}`;
}

// ------------------------------------------------------------------------------- cuerpos del BFF
type Validado<T> = { ok: true; cuerpo: T } | { ok: false; error: string };

/** Aprobar: solo `{ creditos }`, entero mayor que 0. Los topes los valida el servidor. */
export function validarAprobacion(json: unknown): Validado<FeedbackAprobarIn> {
  const creditos = (json as { creditos?: unknown } | null)?.creditos;
  if (typeof creditos !== "number" || !Number.isInteger(creditos) || creditos <= 0) {
    return { ok: false, error: "Escribe los créditos como un número entero mayor que 0." };
  }
  return { ok: true, cuerpo: { creditos } };
}

/** Rechazar: motivo del catálogo, texto para el cliente (3 a 500), nota interna opcional y el original si es duplicado. */
export function validarRechazo(json: unknown): Validado<FeedbackRechazarIn> {
  const j = (json ?? {}) as Record<string, unknown>;
  const motivo_codigo = j.motivo_codigo;
  if (typeof motivo_codigo !== "string" || !(MOTIVOS_DE_RECHAZO as readonly string[]).includes(motivo_codigo)) {
    return { ok: false, error: "Elige el motivo del rechazo." };
  }
  const motivo = typeof j.motivo === "string" ? j.motivo.trim() : "";
  if (motivo.length < 3 || motivo.length > 500) {
    return { ok: false, error: "El texto para el cliente debe tener entre 3 y 500 caracteres." };
  }
  const nota = typeof j.nota_interna === "string" ? j.nota_interna.trim() : "";
  if (nota.length > 2000) return { ok: false, error: "La nota interna admite hasta 2000 caracteres." };
  const duplicado = typeof j.duplicado_de === "string" ? j.duplicado_de.trim() : "";
  if (duplicado && !esUuid(duplicado)) return { ok: false, error: "El id del reporte original no es válido." };
  if (motivo_codigo === "duplicado" && !duplicado) {
    return { ok: false, error: "Escribe el id del reporte original." };
  }
  return {
    ok: true,
    cuerpo: {
      motivo_codigo: motivo_codigo as MotivoDeRechazo,
      motivo,
      ...(nota ? { nota_interna: nota } : {}),
      ...(motivo_codigo === "duplicado" ? { duplicado_de: duplicado } : {}),
    },
  };
}

// --------------------------------------------------------------------------------- errores
export type ErrorDelBff = { error?: unknown; code?: unknown; details?: unknown };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? formatNumber(v) : null);

/**
 * Mensaje claro para los errores de la revisión (ADR-0213). `recargar` = el reporte cambió en el
 * servidor (otro master lo decidió o lo tomó): la vista se refresca para mostrar su estado real.
 */
export function mensajeDeRevision(status: number, json: ErrorDelBff | null): { mensaje: string; recargar: boolean } {
  const code = typeof json?.code === "string" ? json.code : "";
  const d = (json?.details ?? {}) as Record<string, unknown>;
  const servidor = typeof json?.error === "string" && json.error ? json.error : null;
  switch (code) {
    case "reporte_ya_decidido": {
      const estado = typeof d.estado === "string" ? FEEDBACK_STATUS[d.estado]?.label.toLowerCase() : null;
      return { mensaje: `Este reporte ya fue decidido${estado ? ` (${estado})` : ""}. Actualizamos la vista con su estado real.`, recargar: true };
    }
    case "reporte_ya_tomado":
      return { mensaje: "Otra persona del equipo ya tomó este reporte. Actualizamos la vista.", recargar: true };
    case "tope_reporte_excedido": {
      const maximo = num(d.maximo);
      return { mensaje: `El monto pasa el tope por reporte${maximo ? ` (${maximo} créditos)` : ""}. Escribe un monto menor.`, recargar: false };
    }
    case "tope_mensual_excedido": {
      const maximo = num(d.maximo);
      const regalado = num(d.regalado);
      const disponible = num(d.disponible);
      const partes = [
        maximo && `el tope del mes es ${maximo} créditos`,
        regalado && `ya se regalaron ${regalado}`,
        disponible && `quedan ${disponible}`,
      ].filter(Boolean);
      return {
        mensaje: `El monto pasa el tope mensual de regalos de este negocio${partes.length ? `: ${partes.join(", ")}` : ""}.`,
        recargar: false,
      };
    }
    case "monto_invalido":
      return { mensaje: "Escribe los créditos como un número entero mayor que 0.", recargar: false };
    case "sin_ciclo_de_creditos":
      return { mensaje: "El negocio no tiene un ciclo de créditos activo, así que no se le puede regalar ahora.", recargar: false };
    case "duplicado_sin_original":
    case "duplicado_invalido":
    case "duplicado_sin_motivo":
      return { mensaje: servidor ?? "Revisa el id del reporte original.", recargar: false };
    case "abono_inconsistente":
      return { mensaje: "No se pudo acreditar el regalo y la aprobación se deshizo. Inténtalo de nuevo.", recargar: true };
  }
  if (status === 403) return { mensaje: "Solo el master decide los reportes.", recargar: false };
  if (status === 404) return { mensaje: "Ese reporte ya no existe.", recargar: true };
  return { mensaje: servidor ?? "No se pudo completar la acción. Inténtalo de nuevo.", recargar: false };
}

/** «hace 3 h», «hace 2 d»: la antigüedad de un reporte en la bandeja. */
export function antiguedad(iso: string | null | undefined, ahora: Date = new Date()): string {
  if (!iso) return "—";
  const segundos = Math.max(0, Math.round((ahora.getTime() - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return "hace un momento";
  if (segundos < 3600) return `hace ${Math.round(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.round(segundos / 3600)} h`;
  return `hace ${Math.round(segundos / 86400)} d`;
}

/** Nombre visible de una persona del reporte: nombre, si no el correo, si no «Sin nombre». */
export function nombreDePersona(p: { nombre?: string | null; email?: string | null } | null | undefined): string {
  return p?.nombre?.trim() || p?.email?.trim() || "Sin nombre";
}

/** Tamaño de un adjunto: «340 KB», «2,1 MB». */
export function tamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}
