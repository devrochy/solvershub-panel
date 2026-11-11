/**
 * Consumo y plan en palabras (rediseño B): el crédito como «te quedan 9.588 para 9 días», los topes
 * con lo que pasa al llegar, los planes comparables y los pagos por mes. Lógica pura: la página solo
 * pinta lo que devuelve.
 */

import type { PlanResponse } from "@/lib/api/types";
import { formatCop, formatNumber } from "@/lib/format";
import { CONCEPTOS_DE_CREDITO } from "@/lib/plan-limite";

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
export function creditoEnPalabras(credit: Credito | null | undefined, ahora: Date = new Date()): CreditoEnPalabras | null {
  if (!credit) return null;
  if (credit.used == null || credit.percent == null) {
    return {
      titulo: `${entero(credit.limit)} créditos al mes`,
      detalle: "La medición del consumo llega pronto. 1 crédito = $ 10.",
      porcentaje: 0,
      tono: "neutral",
      aviso: null,
    };
  }
  const quedan = Math.max(0, credit.limit - credit.used);
  const dias = diasHasta(credit.period_end, ahora);
  const porcentaje = Math.min(100, Math.max(0, credit.percent));
  const plazo = dias === null ? "" : dias === 0 ? " · se renueva hoy" : ` · para ${dias === 1 ? "1 día" : `${dias} días`}`;
  const detalle = `unos ${formatCop(quedan * PESOS_POR_CREDITO)}${plazo} · usaste ${entero(credit.used)} de ${entero(credit.limit)}`;
  const renueva = credit.period_end ? ` Se renueva el ${diaCorto(credit.period_end, ahora)}.` : "";

  if (credit.percent >= 100) {
    return {
      titulo: "Usaste todo el crédito del mes",
      detalle: `${entero(credit.used)} de ${entero(credit.limit)} créditos`,
      porcentaje,
      tono: "danger",
      aviso: { titulo: "El crédito se acabó", texto: `Por ahora tu asistente sigue respondiendo. Mejora tu plan para tener más cada mes.${renueva}`, tono: "danger" },
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
        : `${conPunto(`A este ritmo alcanza hasta el ${fecha}${hasta}`)} Tu asistente sigue respondiendo, pero conviene mejorar el plan.`,
      tono: "warning",
    };
  }
  return { titulo: `Te quedan ${entero(quedan)} créditos`, detalle, porcentaje, tono: credit.percent >= 80 ? "warning" : "info", aviso };
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

/** Cómo se llama cada tope, en plural, para leerlo como frase («96 de 100 audios»). */
const NOMBRE_DE_TOPE: Record<string, { titulo: string; plural: string; singular: string; mensual?: boolean }> = {
  agentes: { titulo: "Agentes publicados", plural: "agentes", singular: "agente" },
  colaboradores: { titulo: "Personas del equipo", plural: "personas", singular: "persona" },
  clientes: { titulo: "Clientes", plural: "clientes", singular: "cliente" },
  conversaciones: { titulo: "Conversaciones del mes", plural: "conversaciones", singular: "conversación", mensual: true },
  conversations: { titulo: "Conversaciones del mes", plural: "conversaciones", singular: "conversación", mensual: true },
  conversaciones_audio: { titulo: "Notas de voz del mes", plural: "notas de voz", singular: "nota de voz", mensual: true },
  conversaciones_ocr: { titulo: "Imágenes del mes", plural: "imágenes", singular: "imagen", mensual: true },
  mensajes: { titulo: "Mensajes del mes", plural: "mensajes", singular: "mensaje", mensual: true },
};

/** Al llegar a este porcentaje, el tope avisa. */
export const AVISO_DE_TOPE = 90;

export type TopeEnPalabras = {
  clave: string;
  titulo: string;
  /** «96 de 100», o «1.240, sin límite». */
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
};

/** Un tope del plan en palabras: cuánto lleva, cuánto queda y qué pasa al llegar (CYP-04). */
export function topeEnPalabras(uso: Uso): TopeEnPalabras {
  const n = NOMBRE_DE_TOPE[uso.key] ?? { titulo: uso.label, plural: uso.unit, singular: uso.unit };
  if (uso.limit === null) {
    return { clave: uso.key, titulo: n.titulo, uso: `${entero(uso.used)}, sin límite`, porcentaje: null, nota: "Tu plan no tiene tope.", tono: "neutral", mejorar: false };
  }
  const quedan = Math.max(0, uso.limit - uso.used);
  const porcentaje = uso.percent ?? (uso.limit > 0 ? (uso.used / uso.limit) * 100 : 100);
  const lleno = uso.exceeded || quedan === 0;
  const nota = lleno
    ? (AL_TOPE[uso.key] ?? (n.mensual ? `Llegaste al tope del mes` : "Llegaste al tope de tu plan"))
    : `${uso.key === "colaboradores" ? `Puedes invitar a ${entero(quedan)} más` : `Quedan ${entero(quedan)} ${quedan === 1 ? n.singular : n.plural}`}${n.mensual ? " este mes" : ""}`;
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

/** Los topes, con los que piden atención primero y los sin límite al final. */
export function topesEnPalabras(usage: readonly Uso[]): TopeEnPalabras[] {
  const peso = (t: TopeEnPalabras) => (t.porcentaje === null ? -1 : t.porcentaje);
  return usage.map(topeEnPalabras).sort((a, b) => peso(b) - peso(a));
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

/** Un tope del catálogo, como se lee en un plan: «3 agentes», «Personas sin límite». */
export function limiteEnPalabras(clave: string, valor: number | null): string {
  const n = NOMBRE_DE_TOPE[clave];
  const plural = n?.plural ?? clave.replace(/_/g, " ");
  if (valor === null) return `${plural.charAt(0).toUpperCase()}${plural.slice(1)} sin límite`;
  return `${formatNumber(valor)} ${valor === 1 ? (n?.singular ?? plural) : plural}${n?.mensual ? " al mes" : ""}`;
}

const FUNCION: Record<string, string> = {
  reportes: "Reportes",
  multi_negocio: "Varios negocios",
  soporte: "Soporte",
  api: "Acceso por API",
  marca_blanca: "Sin la marca SolversHub",
};

/** Las funciones de un plan en palabras: el texto si lo trae, si no el nombre de la clave. */
export function funcionesEnPalabras(features: Record<string, unknown>): string[] {
  return Object.entries(features)
    .filter(([, v]) => Boolean(v))
    .map(([clave, v]) => (typeof v === "string" ? v : (FUNCION[clave] ?? `${clave.charAt(0).toUpperCase()}${clave.slice(1).replace(/_/g, " ")}`)));
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

/** Nombre del plan de un pago a partir de su id: «Pro» en vez de «pro». */
export function nombreDelPlan(planId: string | null | undefined, planes: readonly Pick<Plan, "id" | "name">[]): string {
  if (!planId) return "Plan";
  return planes.find((p) => p.id === planId)?.name ?? `${planId.charAt(0).toUpperCase()}${planId.slice(1)}`;
}

/** «$ 249.000 al mes» (los planes de pago); «Sin costo» los demás (el plan ya se suele llamar «Gratis»). */
export function precioDelPlan(plan: Pick<Plan, "is_free" | "price_cop">): string {
  return plan.is_free ? "Sin costo" : `${formatCop(plan.price_cop)} al mes`;
}
