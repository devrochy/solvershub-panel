/**
 * Consumo y plan en palabras (rediseño B, planes v3 de D-79): el crédito como «te quedan 9.588 para
 * 9 días», los topes estructurales con lo que pasa al llegar, los planes comparables y los pagos por mes. Lógica pura: la página solo
 * pinta lo que devuelve.
 */

import type { PlanResponse } from "@/lib/api/types";
import { formatCop, formatNumber } from "@/lib/format";
import { CONCEPTOS_DE_CREDITO, METRICAS_DEL_PLAN } from "@/lib/plan-limite";

export type TonoConsumo = "neutral" | "info" | "success" | "warning" | "danger";
export type Etiqueta = { label: string; tono: TonoConsumo };

type Credito = NonNullable<PlanResponse["credit"]>;
type Uso = PlanResponse["usage"][number];
type Plan = PlanResponse["plans"][number];
type Pago = PlanResponse["payments"][number];
type Resumen = NonNullable<PlanResponse["overview"]>;

/** Lo que vale un crédito, en pesos (SPEC-03). */
export const PESOS_POR_CREDITO = 10;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

const entero = (n: number) => formatNumber(Math.round(n));

/** Cierra la frase con punto, sin duplicarlo cuando termina en una abreviatura («nov.»). */
const conPunto = (frase: string) => (frase.endsWith(".") ? frase : `${frase}.`);

/** «19 de nov.» (con el año si no es el de `ahora`). */
export function diaCorto(valor: string | Date | null | undefined, ahora: Date = new Date()): string {
  if (!valor) return "";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${d.getDate()} de ${MESES_CORTOS[d.getMonth()]}`;
  return d.getFullYear() === ahora.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Días enteros que faltan hasta `fin` (0 si ya pasó). */
export function diasHasta(fin: string | null | undefined, ahora: Date = new Date()): number | null {
  if (!fin) return null;
  const ms = new Date(fin).getTime() - ahora.getTime();
  return Number.isNaN(ms) ? null : Math.max(0, Math.ceil(ms / 86_400_000));
}

export type CreditoEnPalabras = {
  /** «Te quedan 9.588 créditos». */
  titulo: string;
  /** «unos $ 95.880 · para 9 días · usaste 50.413 de 60.000». */
  detalle: string;
  porcentaje: number;
  tono: TonoConsumo;
  /** Aviso con el ritmo de consumo, desde el 80 %. */
  aviso: { titulo: string; texto: string; tono: "warning" | "danger" } | null;
};

/**
 * El crédito del mes en palabras (CYP-02): lo que queda en créditos y en pesos, para cuánto tiempo y,
 * desde el 80 %, a qué ritmo se acaba. Sin medición, lo dice en vez de inventar.
 */
export function creditoEnPalabras(credito: Credito | null | undefined, ahora: Date = new Date()): CreditoEnPalabras | null {
  if (!credito) return null;
  if (credito.used == null || credito.percent == null) {
    return {
      titulo: `${entero(credito.limit)} créditos al mes`,
      detalle: "La medición del consumo llega pronto. 1 crédito = $ 10.",
      porcentaje: 0,
      tono: "neutral",
      aviso: null,
    };
  }
  // Con el saldo desglosado (HU-BILL-22) la cuenta es sobre el saldo total del ciclo (mes + acumulado +
  // recargas) y `balance_percent`; sin él, sobre el crédito mensual como siempre.
  const saldo = credito.balance;
  const credit = {
    ...credito,
    used: credito.used,
    limit: saldo ? saldo.total : credito.limit,
    percent: saldo ? (credito.balance_percent ?? (saldo.total > 0 ? (credito.used * 100) / saldo.total : 100)) : credito.percent,
  };
  const quedan = Math.max(0, credit.limit - credit.used);
  const dias = diasHasta(credit.period_end, ahora);
  const porcentaje = Math.min(100, Math.max(0, credit.percent));
  const plazo = dias === null ? "" : dias === 0 ? " · se renueva hoy" : ` · para ${dias === 1 ? "1 día" : `${dias} días`}`;
  const detalle = `unos ${formatCop(quedan * PESOS_POR_CREDITO)}${plazo} · usaste ${entero(credit.used)} de ${entero(credit.limit)}`;
  const renueva = credit.period_end ? ` Se renueva el ${diaCorto(credit.period_end, ahora)}.` : "";

  if (credit.percent >= 100) {
    return {
      titulo: saldo ? "Usaste todo tu saldo de créditos" : "Usaste todo el crédito del mes",
      detalle: `${entero(credit.used)} de ${entero(credit.limit)} créditos`,
      porcentaje,
      tono: "danger",
      aviso: {
        titulo: "El crédito se acabó",
        texto: `Las conversaciones nuevas pasan a una persona de tu equipo; las que estaban en curso siguen con una reserva pequeña. Mejora tu plan para tener más cada mes.${renueva}`,
        tono: "danger",
      },
    };
  }
  let aviso: CreditoEnPalabras["aviso"] = null;
  if (credit.percent >= 80) {
    // Ritmo: lo usado desde el inicio del período, proyectado hasta el final.
    const inicio = credit.period_start ? new Date(credit.period_start).getTime() : NaN;
    const transcurridos = (ahora.getTime() - inicio) / 86_400_000;
    const porDia = transcurridos > 0.5 ? credit.used / transcurridos : NaN;
    const diasQueAlcanza = Number.isFinite(porDia) && porDia > 0 ? quedan / porDia : null;
    const alcanza = diasQueAlcanza === null || dias === null || diasQueAlcanza >= dias;
    const fecha = diasQueAlcanza === null ? "" : diaCorto(new Date(ahora.getTime() + diasQueAlcanza * 86_400_000), ahora);
    const hasta = credit.period_end ? `, y se renueva el ${diaCorto(credit.period_end, ahora)}` : "";
    aviso = {
      titulo: `Vas al ${Math.floor(credit.percent)} %${dias !== null ? ` y faltan ${dias === 1 ? "1 día" : `${dias} días`}` : ""}`,
      texto: alcanza
        ? `A este ritmo te alcanza.${renueva}`
        : `${conPunto(`A este ritmo alcanza hasta el ${fecha}${hasta}`)} Si se acaba, las conversaciones pasan a tu equipo: conviene mejorar el plan.`,
      tono: "warning",
    };
  }
  return { titulo: `Te quedan ${entero(quedan)} créditos`, detalle, porcentaje, tono: credit.percent >= 80 ? "warning" : "info", aviso };
}

type Saldo = NonNullable<Credito["balance"]>;

export type ParteDelSaldo = {
  clave: "mes" | "acumulado" | "recargas";
  nombre: string;
  /** «usaste 3.000 de 12.000». */
  uso: string;
  /** «vence el 19 de dic.» (solo el acumulado). */
  nota: string | null;
};

/**
 * El saldo del ciclo desglosado (HU-BILL-22): el total con su equivalente en pesos y, por parte, lo
 * usado. El crédito del mes siempre va; el acumulado y las recargas solo si hay algo.
 */
export function desgloseDelSaldo(
  saldo: Saldo | null | undefined,
  ahora: Date = new Date(),
): { total: string; partes: ParteDelSaldo[] } | null {
  if (!saldo) return null;
  const uso = (usado: number, total: number) => `usaste ${entero(usado)} de ${entero(total)}`;
  const partes: ParteDelSaldo[] = [{ clave: "mes", nombre: "Del mes", uso: uso(saldo.used_month ?? 0, saldo.month), nota: null }];
  const acumulado = saldo.accumulated ?? 0;
  if (acumulado > 0 || (saldo.used_accumulated ?? 0) > 0) {
    const vence = diaCorto(saldo.accumulated_expires_at, ahora);
    partes.push({ clave: "acumulado", nombre: "Acumulado", uso: uso(saldo.used_accumulated ?? 0, acumulado), nota: vence ? `vence el ${vence}` : null });
  }
  const recargas = saldo.top_ups ?? 0;
  if (recargas > 0 || (saldo.used_top_ups ?? 0) > 0) {
    partes.push({ clave: "recargas", nombre: "Recargas", uso: uso(saldo.used_top_ups ?? 0, recargas), nota: null });
  }
  return { total: `Saldo total: ${creditos(saldo.total)} · ${formatCop(Math.round(saldo.total) * PESOS_POR_CREDITO)}`, partes };
}

type Recarga = PlanResponse["recargas"][number];

/** Un paquete de recarga en palabras: créditos, precio final y, si hay descuento, el de lista y «−15 %». */
export function recargaEnPalabras(paquete: Recarga): { creditos: string; precio: string; lista: string | null; descuento: string | null } {
  const conDescuento = paquete.descuento_pct > 0 && paquete.precio_lista_cop > paquete.precio_cop;
  return {
    creditos: creditos(paquete.creditos),
    precio: formatCop(paquete.precio_cop),
    lista: conDescuento ? formatCop(paquete.precio_lista_cop) : null,
    descuento: conDescuento ? `−${paquete.descuento_pct} %` : null,
  };
}

/** Comprar créditos escribe en la sección `plan` (mismo permiso que `POST /admin/plan/subscribe`). */
export function puedeComprarCreditos(me: { role?: string | null; permissions?: Record<string, string | null | undefined> | null } | null | undefined): boolean {
  if (!me) return false;
  return me.role === "master" || me.permissions?.plan === "write";
}

const ERROR_DE_RECARGA: Record<string, string> = {
  recarga_no_disponible: "Las recargas son para negocios con un plan pago activo. Elige o paga un plan para poder recargar.",
  unknown_package: "Ese paquete ya no está disponible. Cierra y vuelve a abrir la lista de paquetes.",
  checkout_failed: "No pudimos abrir el pago. Intenta de nuevo en unos minutos.",
};

/**
 * El error al comprar créditos: el de «bajo el mínimo» trae el precio y el mínimo de la pasarela y se
 * muestra tal cual; los demás, en un texto propio.
 */
export function errorDeRecarga(code: string | null | undefined, mensaje: string | null | undefined): string {
  if (code === "recarga_bajo_minimo" && mensaje) return mensaje;
  return (code && ERROR_DE_RECARGA[code]) || "No pudimos abrir el pago de la recarga. Vuelve a intentarlo.";
}

/** «3.200 créditos»; «1 crédito». */
export function creditos(n: number): string {
  const redondo = Math.round(n);
  return `${entero(redondo)} ${redondo === 1 ? "crédito" : "créditos"}`;
}

/**
 * Créditos del mes por id de agente (AGT-01, AGT-03): lo que cada agente gastó del crédito del plan.
 * Sin medición (`used` null) o sin desglose, vacío: la vista no muestra la cifra.
 */
export function creditosPorAgenteId(credit: Credito | null | undefined): Map<string, number> {
  if (credit?.used == null) return new Map();
  return new Map((credit.by_agent ?? []).flatMap((a) => (a.agent_id ? [[a.agent_id, a.used] as const] : [])));
}

export type Parte = { nombre: string; usado: number; porcentaje: number };

/** Partes de un total con su porcentaje, de mayor a menor, sin las que están en cero (CYP-03). */
function partes(entradas: { nombre: string; usado: number }[]): Parte[] {
  const total = entradas.reduce((s, e) => s + e.usado, 0);
  if (total <= 0) return [];
  return entradas
    .filter((e) => e.usado > 0)
    .sort((a, b) => b.usado - a.usado)
    .map((e) => ({ ...e, porcentaje: Math.round((e.usado / total) * 100) }));
}

/** En qué se usó el crédito: «Respuestas del asistente · 82 %». */
export function creditoPorConcepto(credit: Credito | null | undefined): Parte[] {
  return partes(Object.entries(credit?.by_concept ?? {}).map(([clave, usado]) => ({ nombre: CONCEPTOS_DE_CREDITO[clave] ?? "Otros usos", usado })));
}

/** El crédito por agente; lo que no es de un agente se llama «Otros». */
export function creditoPorAgente(credit: Credito | null | undefined): (Parte & { agentId: string | null })[] {
  const lista = (credit?.by_agent ?? []).map((a) => ({ nombre: a.name ?? "Otros", usado: a.used, agentId: a.agent_id ?? null }));
  const total = lista.reduce((s, e) => s + e.usado, 0);
  if (total <= 0) return [];
  return lista
    .filter((e) => e.usado > 0)
    .sort((a, b) => (a.agentId === null ? 1 : 0) - (b.agentId === null ? 1 : 0) || b.usado - a.usado)
    .map((e) => ({ ...e, porcentaje: Math.round((e.usado / total) * 100) }));
}


/** Cómo se llama cada tope, para leerlo como frase («2 de 6 conexiones»). */
const NOMBRE_DE_TOPE: Record<string, { titulo: string; plural: string; singular: string }> = {
  agentes: { titulo: "Agentes publicados", plural: "agentes", singular: "agente" },
  colaboradores: { titulo: "Personas del equipo", plural: "personas", singular: "persona" },
  clientes: { titulo: "Clientes", plural: "clientes", singular: "cliente" },
  conexiones: { titulo: "Conexiones de canales", plural: "conexiones", singular: "conexión" },
  correos: { titulo: "Correos conectados", plural: "correos", singular: "correo" },
  // Topes del pack de conocimiento (ADR-0145): salen en el catálogo, no en el consumo.
  documentos: { titulo: "Documentos", plural: "documentos", singular: "documento" },
  conocimiento_mb: { titulo: "Espacio para documentos", plural: "MB para documentos", singular: "MB para documentos" },
};

/** Al llegar a este porcentaje, el tope avisa. */
export const AVISO_DE_TOPE = 90;

export type TopeEnPalabras = {
  clave: string;
  titulo: string;
  /** «2 de 6», «1.240, sin límite» o «No incluido». */
  uso: string;
  porcentaje: number | null;
  /** Lo que pasa: «No puedes publicar otro agente», «Quedan 4». */
  nota: string;
  tono: TonoConsumo;
  /** Al tope o cerca: conviene ofrecer «Mejorar mi plan». */
  mejorar: boolean;
};

/** Qué no se puede hacer al llegar al tope (CYP-04). */
const AL_TOPE: Record<string, string> = {
  agentes: "No puedes publicar otro agente",
  colaboradores: "No puedes invitar a nadie más",
  clientes: "No entran clientes nuevos",
  conexiones: "No puedes agregar otra conexión",
  correos: "No puedes conectar otro correo",
};

/** Un tope del plan en palabras: cuánto lleva, cuánto queda y qué pasa al llegar (CYP-04). */
export function topeEnPalabras(uso: Uso): TopeEnPalabras {
  const n = NOMBRE_DE_TOPE[uso.key] ?? { titulo: uso.label, plural: uso.unit, singular: uso.unit };
  if (uso.limit === null) {
    return { clave: uso.key, titulo: n.titulo, uso: `${entero(uso.used)}, sin límite`, porcentaje: null, nota: "Tu plan no tiene tope.", tono: "neutral", mejorar: false };
  }
  if (uso.limit === 0 && uso.used === 0) {
    // El plan no lo trae (Free no incluye correos): no es un tope lleno, es algo que se gana al mejorar.
    return { clave: uso.key, titulo: n.titulo, uso: "No incluido", porcentaje: null, nota: `Tu plan no incluye ${n.plural}`, tono: "neutral", mejorar: true };
  }
  const quedan = Math.max(0, uso.limit - uso.used);
  const porcentaje = uso.percent ?? (uso.limit > 0 ? (uso.used / uso.limit) * 100 : 100);
  const lleno = uso.exceeded || quedan === 0;
  const nota = lleno
    ? (AL_TOPE[uso.key] ?? "Llegaste al tope de tu plan")
    : uso.key === "colaboradores"
      ? `Puedes invitar a ${entero(quedan)} más`
      : `${quedan === 1 ? "Queda" : "Quedan"} ${entero(quedan)} ${quedan === 1 ? n.singular : n.plural}`;
  return {
    clave: uso.key,
    titulo: n.titulo,
    uso: `${entero(uso.used)} de ${entero(uso.limit)}`,
    porcentaje: Math.min(100, porcentaje),
    nota,
    tono: lleno ? "danger" : porcentaje >= AVISO_DE_TOPE ? "warning" : "info",
    mejorar: lleno || porcentaje >= AVISO_DE_TOPE,
  };
}

/**
 * «Lo que incluye tu plan»: los topes estructurales en el orden de `METRICAS_DEL_PLAN`. Cualquier otra
 * métrica que llegue (las de volumen de v1, si una API vieja las manda) no se pinta.
 */
export function topesEnPalabras(usage: readonly Uso[]): TopeEnPalabras[] {
  const orden = METRICAS_DEL_PLAN as readonly string[];
  return usage
    .filter((u) => orden.includes(u.key))
    .sort((a, b) => orden.indexOf(a.key) - orden.indexOf(b.key))
    .map(topeEnPalabras);
}

/** Estado del plan en palabras (CYP-01), con el pago pendiente por encima de todo. */
export function estadoDelPlan(resumen: Resumen | null | undefined, pagoPendiente: boolean): Etiqueta {
  if (!resumen?.has_plan) return { label: "Sin plan", tono: "neutral" };
  if (pagoPendiente && resumen.status !== "past_due") return { label: "Pago pendiente", tono: "warning" };
  switch (resumen.status) {
    case "active":
      return { label: "Al día", tono: "success" };
    case "trialing":
      return { label: "En prueba", tono: "info" };
    case "past_due":
      return { label: "Pago vencido", tono: "danger" };
    case "expired":
      return { label: "Vencido", tono: "danger" };
    case "canceled":
      return { label: "Cancelado", tono: "neutral" };
    default:
      return resumen.operational ? { label: "Activo", tono: "success" } : { label: "Detenido", tono: "danger" };
  }
}

/** Un tope del catálogo, como se lee en un plan: «3 agentes», «Personas sin límite», «Sin correos». */
export function limiteEnPalabras(clave: string, valor: number | null): string {
  const n = NOMBRE_DE_TOPE[clave];
  const plural = n?.plural ?? clave.replace(/_/g, " ");
  if (valor === null) return `${plural.charAt(0).toUpperCase()}${plural.slice(1)} sin límite`;
  if (valor === 0) return `Sin ${plural}`;
  return `${formatNumber(valor)} ${valor === 1 ? (n?.singular ?? plural) : plural}`;
}

/** El plan que se destaca en el cajón (D-79: Premium es el aspiracional). */
export const PLAN_MAS_ELEGIDO = "premium";

const CANAL_EN_PALABRAS: Record<string, string> = {
  whatsapp: "WhatsApp",
  web: "chat web",
  telegram: "Telegram",
  instagram: "Instagram",
  messenger: "Messenger",
  email: "correo",
};

/** «WhatsApp, chat web y Telegram». */
function lista(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

const SOPORTE: Record<string, string> = {
  comunidad: "Soporte en la comunidad",
  email: "Soporte por correo",
  prioritario: "Soporte prioritario",
  dedicado: "Soporte dedicado",
};

const CAMPANAS: Record<string, string> = {
  recordatorios: "Recordatorios a tus clientes",
  completas: "Campañas a tus clientes",
};

function historial(dias: unknown): string | null {
  if (dias === null) return "Historial sin límite";
  if (typeof dias !== "number" || dias <= 0) return null;
  if (dias % 365 === 0) return dias === 365 ? "Historial de 1 año" : `Historial de ${dias / 365} años`;
  return `Historial de ${formatNumber(dias)} días`;
}

/**
 * Un beneficio del plan v3 (`features`, ADR-0208 §9) en palabras simples, o `null` si no suma nada
 * (`0`, `false`, `"ninguna"`, el nivel de IA estándar). `undefined` si la clave no es del catálogo v3.
 */
function beneficio(clave: string, valor: unknown): string | null | undefined {
  switch (clave) {
    case "canales": {
      const canales = Array.isArray(valor) ? valor.map((c) => CANAL_EN_PALABRAS[String(c)] ?? String(c)) : [];
      return canales.length ? `Atiende por ${lista(canales)}` : null;
    }
    case "nivel_ia":
      return valor === "avanzado" ? "IA Avanzada para tus agentes" : null;
    case "byok":
      return valor === true ? "Conecta tu propia cuenta de IA" : null;
    case "acumulable_meses":
      if (typeof valor !== "number" || valor <= 0) return null;
      return valor === 1 ? "El crédito que no uses pasa al mes siguiente" : `El crédito que no uses se guarda hasta ${valor} meses`;
    case "descuento_recarga":
      // `null`: el plan no compra recargas; `0`: compra sin descuento («Comprar créditos», HU-BILL-23).
      if (typeof valor !== "number" || valor < 0) return null;
      return valor === 0 ? "Puedes comprar créditos extra" : `${valor} % de descuento al comprar créditos`;
    case "marca_propia":
      return valor === true ? "Tu marca, sin la de SolversHub" : null;
    case "exportar":
      return valor === true ? "Descarga tu historial en CSV" : null;
    case "historial_dias":
      return historial(valor);
    case "campanas":
      return typeof valor === "string" ? (CAMPANAS[valor] ?? null) : null;
    case "soporte":
      return typeof valor === "string" ? (SOPORTE[valor] ?? valor) : null;
    default:
      return undefined;
  }
}

/** Orden de los beneficios en la tarjeta del plan. */
const ORDEN_DE_BENEFICIOS = ["canales", "nivel_ia", "acumulable_meses", "descuento_recarga", "marca_propia", "historial_dias", "exportar", "campanas", "byok", "soporte"];

const FUNCION: Record<string, string> = {
  reportes: "Reportes",
  multi_negocio: "Varios negocios",
  api: "Acceso por API",
  marca_blanca: "Sin la marca SolversHub",
};

/**
 * Los beneficios de un plan en palabras: los del catálogo v3 con su regla por valor y, para una clave
 * que no conoce, el texto si lo trae o el nombre de la clave.
 */
export function funcionesEnPalabras(features: Record<string, unknown>): string[] {
  const peso = (k: string) => (ORDEN_DE_BENEFICIOS.includes(k) ? ORDEN_DE_BENEFICIOS.indexOf(k) : ORDEN_DE_BENEFICIOS.length);
  return Object.entries(features)
    .sort(([a], [b]) => peso(a) - peso(b))
    .flatMap(([clave, v]) => {
      const conocido = beneficio(clave, v);
      if (conocido !== undefined) return conocido ? [conocido] : [];
      if (!v) return [];
      return [typeof v === "string" ? v : (FUNCION[clave] ?? `${clave.charAt(0).toUpperCase()}${clave.slice(1).replace(/_/g, " ")}`)];
    });
}

export type AccionDePlan = { tipo: "actual" | "mejorar" | "cambiar" | "gratis"; label: string };

/** El botón de cada plan (CYP-05): «Mejorar a Empresa» si cuesta más que el actual, si no «Cambiar a…». */
export function accionDePlan(plan: Plan, actual: Plan | undefined): AccionDePlan {
  if (plan.current) return { tipo: "actual", label: "Tu plan actual" };
  if (plan.is_free) return { tipo: "gratis", label: "Para empezar" };
  if (!actual || plan.price_cop > actual.price_cop) return { tipo: "mejorar", label: `Mejorar a ${plan.name}` };
  return { tipo: "cambiar", label: `Cambiar a ${plan.name}` };
}

/** «Noviembre 2026» a partir de «2026-11» (o de la fecha del pago). */
export function mesDelPago(pago: Pick<Pago, "periodo" | "created_at">): string {
  const m = pago.periodo ? /^(\d{4})-(\d{2})/.exec(pago.periodo) : null;
  const fecha = m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : new Date(pago.created_at);
  if (Number.isNaN(fecha.getTime())) return "Pago";
  const mes = MESES[fecha.getMonth()];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${fecha.getFullYear()}`;
}

const CANAL: Record<string, string> = {
  asistente: "Por el asistente de SolversHub",
  wompi: "Por el panel",
  plataforma: "Cobro automático",
};

export function canalDelPago(proveedor: string | null | undefined): string {
  return (proveedor && CANAL[proveedor]) || "Pago registrado";
}

/** Estado de un pago en palabras (CYP-06), con qué hacer si no pasó. */
export function estadoDelPago(estado: string): Etiqueta & { explicacion?: string } {
  switch (estado) {
    case "approved":
    case "aprobado":
    case "paid":
      return { label: "Pagado", tono: "success" };
    case "pending":
    case "pendiente":
      return { label: "Pendiente", tono: "warning" };
    case "declined":
    case "rechazado":
      return { label: "Rechazado", tono: "danger", explicacion: "El banco no lo aprobó." };
    case "failed":
      return { label: "No se completó", tono: "danger", explicacion: "El pago no terminó. Puedes intentarlo otra vez." };
    case "anulado":
      return { label: "Anulado", tono: "neutral", explicacion: "Lo reemplazó un cambio de plan." };
    default:
      return { label: "En revisión", tono: "neutral" };
  }
}

/** «Noviembre 2026 · Plan Basic» o, si es una recarga, «Noviembre 2026 · Recarga de 5.000 créditos». */
export function tituloDelPago(pago: Pick<Pago, "periodo" | "created_at" | "plan_id" | "concepto" | "creditos">, planes: readonly Pick<Plan, "id" | "name">[]): string {
  if (pago.concepto === "recarga") {
    return `${mesDelPago(pago)} · ${pago.creditos != null ? `Recarga de ${creditos(pago.creditos)}` : "Recarga de créditos"}`;
  }
  return `${mesDelPago(pago)} · Plan ${nombreDelPlan(pago.plan_id, planes)}`;
}

/** Nombre del plan de un pago a partir de su id: «Pro» en vez de «pro». */
export function nombreDelPlan(planId: string | null | undefined, planes: readonly Pick<Plan, "id" | "name">[]): string {
  if (!planId) return "Plan";
  return planes.find((p) => p.id === planId)?.name ?? `${planId.charAt(0).toUpperCase()}${planId.slice(1)}`;
}

/** «$ 129.000 al mes» (los planes de pago); «Sin costo» los demás (el plan ya se suele llamar «Gratis»). */
export function precioDelPlan(plan: Pick<Plan, "is_free" | "price_cop">): string {
  return plan.is_free ? "Sin costo" : `${formatCop(plan.price_cop)} al mes`;
}
