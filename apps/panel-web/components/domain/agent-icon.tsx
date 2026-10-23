import {
  Bot,
  Calendar,
  CircleDollarSign,
  Repeat,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Meta = { icon: LucideIcon; tone: string; label: string };

/** Icono por agente del negocio. La clave viene de la API (`agents[].key`). */
const AGENTES: Record<string, Meta> = {
  general: { icon: Bot, tone: "text-data-2", label: "General" },
  ventas: { icon: ShoppingCart, tone: "text-status-warning-fg", label: "Ventas" },
  cobranza: { icon: Wallet, tone: "text-status-danger-fg", label: "Cobranza" },
  agenda: { icon: Calendar, tone: "text-data-1", label: "Agenda" },
  suscripciones: { icon: Repeat, tone: "text-data-4", label: "Suscripciones" },
  pagos: { icon: CircleDollarSign, tone: "text-status-success-fg", label: "Pagos" },
};

export function agentMeta(key: string | null | undefined, name?: string | null): Meta {
  return (
    (key ? AGENTES[key] : undefined) ?? {
      icon: Bot,
      tone: "text-body",
      label: name?.trim() || key || "Agente",
    }
  );
}

/** Icono de un agente; `muted` cuando el cliente todavía no tiene data de ese agente. */
export function AgentIcon({
  agentKey,
  name,
  muted = false,
}: {
  agentKey: string | null | undefined;
  name?: string | null;
  muted?: boolean;
}) {
  const meta = agentMeta(agentKey, name);
  const Icon = meta.icon;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-hover",
        meta.tone,
        muted && "opacity-35 grayscale",
      )}
      title={meta.label}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}
