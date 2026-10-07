import {
  Calendar,
  Globe,
  Camera,
  Mail,
  MessageCircle,
  MessageSquare,
  Plug,
  QrCode,
  Send,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Icono por canal/tipo de conexión, en tonos semánticos del tema. */
const CHANNELS: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  whatsapp: { icon: MessageCircle, tone: "text-success", label: "WhatsApp" },
  whatsapp_cloud: { icon: MessageCircle, tone: "text-success", label: "WhatsApp Cloud" },
  whatsapp_waweb: { icon: QrCode, tone: "text-success", label: "WhatsApp Web (QR)" },
  instagram: { icon: Camera, tone: "text-danger", label: "Instagram" },
  messenger: { icon: Send, tone: "text-link", label: "Messenger" },
  facebook: { icon: Send, tone: "text-link", label: "Facebook" },
  email: { icon: Mail, tone: "text-gold", label: "Correo" },
  sms: { icon: MessageSquare, tone: "text-accent", label: "SMS" },
  webchat: { icon: Globe, tone: "text-primary", label: "Chat web" },
  web: { icon: Globe, tone: "text-primary", label: "Web" },
  calendar: { icon: Calendar, tone: "text-blue", label: "Calendario" },
  commerce: { icon: ShoppingCart, tone: "text-warning", label: "Comercio" },
};

export function channelMeta(id: string | null | undefined) {
  return (
    (id ? CHANNELS[id] : undefined) ?? {
      icon: Plug,
      tone: "text-body",
      label: id ?? "Canal",
    }
  );
}

export function ChannelIcon({
  id,
  size = "md",
}: {
  id: string | null | undefined;
  size?: "sm" | "md";
}) {
  const meta = channelMeta(id);
  const Icon = meta.icon;
  const caja = size === "sm" ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-lg";
  const icono = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center bg-hover ${caja} ${meta.tone}`}
      title={meta.label}
    >
      <Icon className={icono} />
    </span>
  );
}

/** Canal con su icono y etiqueta (para celdas de tabla y listados). */
export function ChannelBadge({ id, label }: { id: string | null | undefined; label?: string | null }) {
  const meta = channelMeta(id);
  return (
    <span className="flex items-center gap-2">
      <ChannelIcon id={id} size="sm" />
      <span className="text-body">{label ?? meta.label}</span>
    </span>
  );
}
