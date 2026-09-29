import {
  Calendar,
  Globe,
  Instagram,
  Mail,
  MessageCircle,
  MessageSquare,
  Plug,
  QrCode,
  Send,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Icono por canal/tipo de conexión, en colores pastel empresariales. */
const CHANNELS: Record<string, { icon: LucideIcon; classes: string; label: string }> = {
  whatsapp: { icon: MessageCircle, classes: "bg-emerald-100 text-emerald-700", label: "WhatsApp" },
  whatsapp_cloud: { icon: MessageCircle, classes: "bg-emerald-100 text-emerald-700", label: "WhatsApp Cloud" },
  whatsapp_waweb: { icon: QrCode, classes: "bg-teal-100 text-teal-700", label: "WhatsApp Web (QR)" },
  instagram: { icon: Instagram, classes: "bg-fuchsia-100 text-fuchsia-700", label: "Instagram" },
  messenger: { icon: Send, classes: "bg-sky-100 text-sky-700", label: "Messenger" },
  facebook: { icon: Send, classes: "bg-indigo-100 text-indigo-700", label: "Facebook" },
  email: { icon: Mail, classes: "bg-amber-100 text-amber-700", label: "Correo" },
  sms: { icon: MessageSquare, classes: "bg-violet-100 text-violet-700", label: "SMS" },
  webchat: { icon: Globe, classes: "bg-rose-100 text-rose-700", label: "Chat web" },
  web: { icon: Globe, classes: "bg-rose-100 text-rose-700", label: "Web" },
  calendar: { icon: Calendar, classes: "bg-blue-100 text-blue-700", label: "Calendario" },
  commerce: { icon: ShoppingCart, classes: "bg-orange-100 text-orange-700", label: "Comercio" },
};

export function channelMeta(id: string | null | undefined) {
  return (
    (id ? CHANNELS[id] : undefined) ?? {
      icon: Plug,
      classes: "bg-slate-100 text-slate-700",
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
      className={`inline-flex shrink-0 items-center justify-center ${caja} ${meta.classes}`}
      title={meta.label}
    >
      <Icon className={icono} />
    </span>
  );
}

/** Canal con su icono pastel y etiqueta (para celdas de tabla y listados). */
export function ChannelBadge({ id, label }: { id: string | null | undefined; label?: string | null }) {
  const meta = channelMeta(id);
  return (
    <span className="flex items-center gap-2">
      <ChannelIcon id={id} size="sm" />
      <span className="text-body">{label ?? meta.label}</span>
    </span>
  );
}
