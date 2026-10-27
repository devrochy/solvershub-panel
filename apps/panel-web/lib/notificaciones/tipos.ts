import {
  AlertOctagon,
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Info,
  type LucideIcon,
  MessageSquare,
  Server,
  ShoppingBag,
} from "lucide-react";

import { NAV_GROUPS } from "@/components/shell/nav";
import type { NotificacionDestino } from "@/lib/api/types";
import { seccionesDePaleta, type PacksDelNegocio } from "@/lib/shell/paleta";
import type { Permisos } from "@/lib/shell/navegacion";

/**
 * Clasificación visual del centro de notificaciones (ADR-0167). Dos ejes:
 * - la **categoría** (qué área del negocio) lleva el icono y la etiqueta;
 * - la **severidad** (qué tan urgente) lleva el color, siempre con icono y texto: el color
 *   nunca va solo (DESIGN.md · Accesibilidad).
 */
export const CATEGORIAS = ["conversaciones", "ventas", "cobros", "agenda", "sistema"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const SEVERIDADES = ["info", "success", "warning", "critical"] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const CATEGORIA: Record<Categoria, { label: string; icon: LucideIcon }> = {
  conversaciones: { label: "Conversaciones", icon: MessageSquare },
  ventas: { label: "Ventas", icon: ShoppingBag },
  cobros: { label: "Cobros", icon: Banknote },
  agenda: { label: "Agenda", icon: CalendarClock },
  sistema: { label: "Sistema", icon: Server },
};

/** Tono (token `status-*` con AA por tema) y icono de cada severidad. */
export const SEVERIDAD: Record<
  Severidad,
  { label: string; icon: LucideIcon; tono: "info" | "success" | "warning" | "danger"; fondo: string; texto: string; borde: string }
> = {
  info: {
    label: "Información",
    icon: Info,
    tono: "info",
    fondo: "bg-status-info-bg",
    texto: "text-status-info-fg",
    borde: "border-status-info-border",
  },
  success: {
    label: "Éxito",
    icon: CheckCircle2,
    tono: "success",
    fondo: "bg-status-success-bg",
    texto: "text-status-success-fg",
    borde: "border-status-success-border",
  },
  warning: {
    label: "Atención",
    icon: AlertTriangle,
    tono: "warning",
    fondo: "bg-status-warning-bg",
    texto: "text-status-warning-fg",
    borde: "border-status-warning-border",
  },
  critical: {
    label: "Urgente",
    icon: AlertOctagon,
    tono: "danger",
    fondo: "bg-status-danger-bg",
    texto: "text-status-danger-fg",
    borde: "border-status-danger-border",
  },
};

export function categoriaDe(valor: string): Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor) ? (valor as Categoria) : "sistema";
}

export function severidadDe(valor: string): Severidad {
  return (SEVERIDADES as readonly string[]).includes(valor) ? (valor as Severidad) : "info";
}

/**
 * A dónde lleva cada entidad del destino neutro `{entity, id, section}`. Devuelve rutas
 * candidatas en orden de preferencia: la primera que el usuario ve en su menú es la que se
 * usa (nunca un 403 por diseño). `base` es la ruta sin query, la que se busca en el menú.
 */
export function candidatasDeDestino(destino: NotificacionDestino): { href: string; base: string }[] {
  const id = destino.id ? encodeURIComponent(destino.id) : null;
  const ruta = (base: string, href = base) => ({ href, base });
  switch (destino.entity) {
    case "conversacion":
      return [id ? ruta("/conversaciones", `/conversaciones?c=${id}`) : ruta("/conversaciones"), ruta("/escalaciones")];
    case "escalacion":
      return [ruta("/escalaciones")];
    case "lead":
    case "cliente":
      return [ruta("/leads")];
    case "pedido":
    case "pago":
      return [ruta("/comercio/pedidos")];
    case "suscripcion":
      return [id ? ruta("/suscripciones/lista", `/suscripciones/lista/${id}`) : ruta("/suscripciones/lista")];
    case "cobro":
      return [ruta("/suscripciones/pagos")];
    case "cita":
      return [ruta("/calendario")];
    case "conexion":
      return [ruta("/conexiones")];
    case "mensaje_fallido":
      return [ruta("/dlq")];
    case "cobranza":
      return [ruta("/cobranza")];
    default:
      return [];
  }
}

/** Ruta a la que lleva una notificación para este usuario, o `null` si no tiene a dónde. */
export function rutaDeNotificacion(
  destino: NotificacionDestino | null | undefined,
  permisos: Permisos,
  packs: PacksDelNegocio = {},
  esMaster = false,
): string | null {
  if (!destino) return null;
  const visibles = new Set(seccionesDePaleta(permisos, packs, NAV_GROUPS, esMaster).map((s) => s.href));
  for (const { href, base } of candidatasDeDestino(destino)) {
    if (visibles.has(base)) return href;
  }
  return null;
}

/** «hace 5 min», «hace 3 h», «ayer»… en español, sin librería. */
export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const diff = ahora.getTime() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function inicioDelDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

/** Encabezado del grupo por día: Hoy, Ayer o «12 de octubre». */
export function etiquetaDeDia(iso: string, ahora: Date = new Date()): string {
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(new Date(iso))) / 86_400_000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long" });
}

export type GrupoDeDia<T extends { created_at: string }> = { dia: string; items: T[] };

/** Agrupa (en el orden recibido, el más reciente primero) por día. */
export function agruparPorDia<T extends { created_at: string }>(items: T[], ahora: Date = new Date()): GrupoDeDia<T>[] {
  const grupos: GrupoDeDia<T>[] = [];
  for (const item of items) {
    const dia = etiquetaDeDia(item.created_at, ahora);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.items.push(item);
    else grupos.push({ dia, items: [item] });
  }
  return grupos;
}

/** Opciones de silencio del push (minutos). `null` = hasta mañana a las 8:00. */
export const OPCIONES_SILENCIO: { label: string; minutos: number | "manana" }[] = [
  { label: "1 hora", minutos: 60 },
  { label: "8 horas", minutos: 480 },
  { label: "Hasta mañana", minutos: "manana" },
];

export function minutosHastaManana(ahora: Date = new Date()): number {
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 8, 0, 0);
  return Math.max(1, Math.round((manana.getTime() - ahora.getTime()) / 60_000));
}
