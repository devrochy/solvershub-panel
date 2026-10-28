/**
 * Administración de suscripciones (SPEC-35, HU-SUB-08/19/20/16): filtros de las listas, etiquetas
 * y textos de las acciones. Lógica pura; el fetch vive en las páginas.
 *
 * Qué significa cada cifra (lo define el backend, ADR-0106):
 * - «Debe» = cobros de período pendientes (vencidos o por vencer); «en mora» = los ya vencidos.
 * - Pagos = cobros de la suscripción: `pendiente`, `pagado` o `anulado`.
 * - El MRR cuenta solo suscripciones activas de pago (trimestral ÷ 3, anual ÷ 12).
 */
import type { SuscripcionDetalle } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/format";

export const RUTA = "/suscripciones";

// ----------------------------------------------------------------------------- filtros
export type FiltrosSuscripciones = {
  estado?: string;
  plan?: string;
  periodicidad?: string;
  con_mora?: string;
  q?: string;
  cliente_id?: string;
  page?: string;
};

export type FiltrosPagos = {
  estado?: string;
  tipo?: string;
  vencidos?: string;
  desde?: string;
  hasta?: string;
  q?: string;
  suscripcion_id?: string;
  page?: string;
};

export type FiltrosClientesSuscripcion = {
  q?: string;
  con_mora?: string;
  incluir_canceladas?: string;
  page?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function texto(qs: URLSearchParams, clave: string, valor: string | undefined) {
  const limpio = valor?.trim();
  if (limpio) qs.set(clave, limpio);
}

function opcion(qs: URLSearchParams, clave: string, valor: string | undefined, validos: readonly string[]) {
  if (valor && validos.includes(valor)) qs.set(clave, valor);
}

function verdadero(valor: string | undefined): boolean {
  return valor === "1" || valor === "true";
}

function pagina(qs: URLSearchParams, valor: string | undefined) {
  if (valor && /^[1-9]\d{0,5}$/.test(valor)) qs.set("page", valor);
}

export const ESTADOS_SUSCRIPCION = ["activa", "trialing", "pausada", "vencida", "cancelada"] as const;
export const ESTADOS_PAGO = ["pendiente", "pagado", "anulado"] as const;
export const TIPOS_PAGO = ["periodo", "cambio_plan"] as const;
export const PERIODICIDADES = ["mensual", "trimestral", "anual"] as const;

/** Query de `GET /suscripciones`; lo que no es válido se descarta en vez de llegar a la API. */
export function consultaSuscripciones(sp: FiltrosSuscripciones): URLSearchParams {
  const qs = new URLSearchParams();
  opcion(qs, "estado", sp.estado, ESTADOS_SUSCRIPCION);
  if (sp.plan && UUID.test(sp.plan)) qs.set("variante_id", sp.plan);
  opcion(qs, "periodicidad", sp.periodicidad, PERIODICIDADES);
  if (verdadero(sp.con_mora)) qs.set("con_mora", "true");
  texto(qs, "q", sp.q);
  if (sp.cliente_id && UUID.test(sp.cliente_id)) qs.set("cliente_id", sp.cliente_id);
  pagina(qs, sp.page);
  return qs;
}

/** Query de `GET /cargos` (los pagos). */
export function consultaPagos(sp: FiltrosPagos): URLSearchParams {
  const qs = new URLSearchParams();
  opcion(qs, "estado", sp.estado, ESTADOS_PAGO);
  opcion(qs, "tipo", sp.tipo, TIPOS_PAGO);
  if (verdadero(sp.vencidos)) qs.set("vencidos", "true");
  if (sp.desde && FECHA.test(sp.desde)) qs.set("desde", sp.desde);
  if (sp.hasta && FECHA.test(sp.hasta)) qs.set("hasta", sp.hasta);
  texto(qs, "q", sp.q);
  if (sp.suscripcion_id && UUID.test(sp.suscripcion_id)) qs.set("suscripcion_id", sp.suscripcion_id);
  pagina(qs, sp.page);
  return qs;
}

/** Query de `GET /clientes`. */
export function consultaClientesSuscripcion(sp: FiltrosClientesSuscripcion): URLSearchParams {
  const qs = new URLSearchParams();
  texto(qs, "q", sp.q);
  if (verdadero(sp.con_mora)) qs.set("con_mora", "true");
  if (verdadero(sp.incluir_canceladas)) qs.set("incluir_canceladas", "true");
  pagina(qs, sp.page);
  return qs;
}

/** `?a=1&b=2` o "" según haya filtros: para armar enlaces que conservan la búsqueda. */
export function conQuery(qs: URLSearchParams): string {
  return qs.size ? `?${qs.toString()}` : "";
}

/** Enlace a la página `destino` con los filtros de `qs` y la página pedida. */
export function enlaceDePagina(destino: string, qs: URLSearchParams, pagina: number): string {
  const siguiente = new URLSearchParams(qs);
  siguiente.set("page", String(pagina));
  return `${destino}?${siguiente.toString()}`;
}

// ----------------------------------------------------------------------------- etiquetas
export const PERIODICIDAD_LABEL: Record<string, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

export function periodicidadLabel(valor: string): string {
  return PERIODICIDAD_LABEL[valor] ?? valor;
}

export const MOTIVO_PAUSA_LABEL: Record<string, string> = {
  mora: "Pausada por mora",
  cliente: "Pausada por el negocio",
};

export const TIPO_PAGO_LABEL: Record<string, string> = {
  periodo: "Período",
  cambio_plan: "Cambio de plan",
};

export function tipoDePagoLabel(valor: string): string {
  return TIPO_PAGO_LABEL[valor] ?? valor;
}

export const HISTORIAL_LABEL: Record<string, string> = {
  subs_pausada: "Pausada",
  subs_reanudada: "Reanudada",
  subs_cancelada: "Cancelada",
  subs_pausada_por_mora: "Pausada por mora",
  subs_link_reenviado: "Link de pago reenviado",
};

export function historialLabel(accion: string): string {
  return HISTORIAL_LABEL[accion] ?? accion;
}

/** «Hoy» / «hace 3 días» no aplica a mora: «1 día de mora», «12 días de mora» o «Sin mora». */
export function textoDeMora(dias: number | null | undefined): string {
  if (dias == null) return "Sin mora";
  if (dias <= 0) return "Vence hoy";
  return dias === 1 ? "1 día de mora" : `${dias} días de mora`;
}

/** Quien actúa sale de la auditoría como `admin:correo`; en pantalla solo el correo. */
export function actorVisible(actor: string): string {
  if (actor.startsWith("admin:")) return actor.slice("admin:".length);
  if (actor.startsWith("plugin:")) return "Automático";
  return actor;
}

/** Nombre a mostrar de un cliente de la suscripción (el core no guarda correo). */
export function nombreDelCliente(c: { nombre?: string | null; telefono?: string | null }): string {
  return c.nombre?.trim() || c.telefono?.trim() || "Cliente sin nombre";
}

/** Variación porcentual frente al período anterior; null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}

/** Fracción 0–1 como porcentaje legible («16,7 %»); "—" si no hay dato. */
export function porcentaje(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return `${(valor * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
}

// ----------------------------------------------------------------------------- acciones
export type AccionSuscripcion = "pausar" | "reanudar" | "cancelar";

export const ACCION_LABEL: Record<AccionSuscripcion, string> = {
  pausar: "Pausar",
  reanudar: "Reanudar",
  cancelar: "Cancelar",
};

type Confirmacion = { title: string; description: string; confirmLabel: string; destructive: boolean };

/** Texto de confirmación: dice qué pasa con los cobros y con el cliente (constitución §1.3). */
export function confirmacionDeAccion(
  accion: AccionSuscripcion,
  s: Pick<SuscripcionDetalle, "plan" | "cliente">,
): Confirmacion {
  const quien = nombreDelCliente(s.cliente);
  const que = `«${s.plan}» de ${quien}`;
  switch (accion) {
    case "pausar":
      return {
        title: `¿Pausar ${que}?`,
        description:
          "Dejan de generarse cobros nuevos y de enviarse recordatorios. Los cobros que ya estén pendientes " +
          "siguen abiertos y su link sigue funcionando. Puedes reanudarla cuando quieras.",
        confirmLabel: "Pausar suscripción",
        destructive: false,
      };
    case "reanudar":
      return {
        title: `¿Reanudar ${que}?`,
        description:
          "Vuelve a estar activa y el próximo cobro se calcula desde hoy. Si tenía cobros pendientes, " +
          "se retoman sus recordatorios.",
        confirmLabel: "Reanudar suscripción",
        destructive: false,
      };
    case "cancelar":
      return {
        title: `¿Cancelar ${que}?`,
        description:
          "Termina la suscripción: no se generan más cobros ni recordatorios, y no se puede reanudar. " +
          "Si el cliente quiere volver, hay que crear una suscripción nueva. Los cobros pendientes no se borran.",
        confirmLabel: "Cancelar suscripción",
        destructive: true,
      };
  }
}

/** Texto de confirmación del reenvío del link de un cobro pendiente. */
export function confirmacionDeReenvio(
  cargo: { periodo: string; monto: number; moneda?: string | null },
  cliente: string,
): Pick<Confirmacion, "title" | "description" | "confirmLabel"> {
  return {
    title: `¿Reenviar el link de pago a ${cliente}?`,
    description:
      `Se le envía por WhatsApp el link del cobro ${cargo.periodo} por ` +
      `${formatMoney(cargo.monto, cargo.moneda ?? "COP")}. Si no tiene una conversación de WhatsApp, ` +
      "no se envía nada y podrás copiar el link.",
    confirmLabel: "Reenviar link",
  };
}

/** Texto del diálogo para registrar la transferencia de un cobro (HU-SUB-26). */
export function descripcionDeRegistroDePago(
  cargo: { periodo: string; monto: number; moneda?: string | null },
  cliente: string,
): string {
  return (
    `Marca como pagado el cobro ${cargo.periodo} de ${cliente} por ` +
    `${formatMoney(cargo.monto, cargo.moneda ?? "COP")}. El cliente deja de recibir recordatorios y, ` +
    "si su suscripción estaba pausada por mora, se reactiva. Verifica antes que el dinero llegó: " +
    "el sistema no lo comprueba."
  );
}

/** Resultado de registrar el pago en palabras del negocio. */
export function mensajeDePagoRegistrado(r: { estado: string; suscripcion_estado: string }): string {
  if (r.estado === "ya_registrado") return "Este pago ya estaba registrado con esa referencia.";
  return r.suscripcion_estado === "activa"
    ? "Pago registrado. La suscripción está activa."
    : "Pago registrado.";
}

/** Resultado del reenvío en palabras del negocio. */
export function mensajeDeReenvio(r: { enviado: boolean; motivo?: string | null }): string {
  if (r.enviado) return "Listo: el link salió por WhatsApp.";
  if (r.motivo === "sin_conversacion_whatsapp") {
    return "El cliente no tiene una conversación de WhatsApp: copia el link y envíaselo por otro medio.";
  }
  return "No se pudo enviar el link.";
}

// ----------------------------------------------------------------------------- permisos y planes
/** Pausar, reanudar, cancelar y reenviar links: solo con acceso de escritura a la sección. */
export function puedeAdministrar(
  me: { role?: string | null; permissions?: Record<string, string | null> | null } | null | undefined,
): boolean {
  if (!me) return false;
  return me.role === "master" || me.role === "tester" || me.permissions?.["pack_subscriptions:suscripciones"] === "write";
}

export type OpcionDePlan = { value: string; label: string };

/** Planes (variantes con recurrencia) del catálogo de Ventas, para el filtro por plan. */
export function planesDeProductos(
  productos: { name: string; variants: { id: string; sku: string; billing_period?: string | null }[] }[],
): OpcionDePlan[] {
  const planes: OpcionDePlan[] = [];
  for (const p of productos) {
    for (const v of p.variants) {
      if (!v.billing_period) continue;
      const solo = p.variants.filter((x) => x.billing_period).length === 1;
      planes.push({ value: v.id, label: solo ? p.name : `${p.name} · ${v.sku}` });
    }
  }
  return planes.sort((a, b) => a.label.localeCompare(b.label, "es"));
}

// ----------------------------------------------------------------------------- avisos al cliente
export const AVISO_LABEL: Record<string, string> = {
  "subscription.charge_created": "Aviso del cobro con su link",
  "subscription.charge_reminder": "Recordatorio de pago",
  "subscription.past_due": "Suscripción vencida",
  "subscription.paused": "Aviso de pausa por mora",
  "subscription.trial_ending": "Fin de la prueba",
};

export function avisoLabel(evento: string): string {
  return AVISO_LABEL[evento] ?? evento;
}

const MENSAJE_LABEL: Record<string, string> = {
  queued: "En cola",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "No se pudo enviar",
};

/** Qué pasó con un aviso, en palabras: primero el mensaje, si ya salió; si no, el evento. */
export function resultadoDelAviso(a: {
  estado_evento: string;
  mensaje_estado?: string | null;
  mensaje_error?: string | null;
}): string {
  if (a.mensaje_error === "sin_plantilla") return "No salió: falta una plantilla aprobada";
  if (a.mensaje_estado) return MENSAJE_LABEL[a.mensaje_estado] ?? a.mensaje_estado;
  if (a.estado_evento === "fallido") return "No se pudo enviar";
  if (a.estado_evento === "entregado") return "Procesado";
  return "Pendiente de envío";
}

// ----------------------------------------------------------------------------- resumen
/** «2026-10» → «octubre de 2026» (la cohorte del alta). */
export function mesLegible(cohorte: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(cohorte);
  if (!m) return cohorte;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Retención de una cohorte: las altas que siguen vigentes hoy (no canceladas). */
export function retencion(altas: number, vigentes: number): string {
  return altas > 0 ? porcentaje(vigentes / altas) : "—";
}

/** Aviso del downgrade programado para el próximo período (ADR-0111); null si no hay. */
export function cambioProgramadoTexto(
  cambio: Record<string, unknown> | null | undefined,
  moneda: string,
): string | null {
  if (!cambio) return null;
  const plan = (cambio.plan ?? {}) as { nombre?: unknown; precio?: unknown };
  const nombre = typeof plan.nombre === "string" && plan.nombre ? plan.nombre : "otro plan";
  const precio = typeof plan.precio === "number" ? ` (${formatMoney(plan.precio, moneda)})` : "";
  const desde = typeof cambio.desde === "string" ? ` desde el ${formatDate(cambio.desde)}` : "";
  return `Pasará a «${nombre}»${precio}${desde}, sin reembolso de lo ya pagado.`;
}

/** Canal que pagó un cobro por fuera del link del pack (pago externo), o null. */
export function canalDePagoExterno(pago: Record<string, unknown> | null | undefined): string | null {
  const canal = pago?.canal;
  return typeof canal === "string" && canal ? canal : null;
}
