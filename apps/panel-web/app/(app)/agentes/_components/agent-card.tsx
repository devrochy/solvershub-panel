import Link from "next/link";
import { Bot, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AgentOverviewItem } from "@/lib/api/types";
import { tipoDeAgente } from "@/lib/agentes";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";

/** Tarjeta de un agente en la lista: qué es, dónde atiende y qué hizo en 30 días. */
export function AgentCard({ agent }: { agent: AgentOverviewItem }) {
  const conexiones = agent.connections.map((c) => c.label);
  return (
    <Card className="flex w-full flex-col">
      <Link
        href={`/agentes/${agent.ref}`}
        className="group flex flex-1 flex-col gap-4 rounded-lg p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-bg-deep text-link" aria-hidden>
              <Bot className="size-5" />
            </span>
            <div>
              <p className="font-display text-sh-block text-headline">{agent.name}</p>
              <p className="text-sh-caption text-text-soft">{tipoDeAgente(agent.kind)}</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-text-soft transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>

        <div className="flex flex-wrap gap-2">
          {agent.virtual ? (
            <Badge variant="info">Sin Agent OS todavía</Badge>
          ) : agent.published ? (
            <Badge variant="success">Atendiendo</Badge>
          ) : (
            <Badge variant="neutral">Sin conexión activa</Badge>
          )}
          {conexiones.map((label, i) => (
            <Badge key={`${label}-${i}`} variant="neutral">
              {label}
            </Badge>
          ))}
        </div>

        <dl className="grid grid-cols-3 gap-3 border-t border-border-soft pt-4">
          <div>
            <dt className="text-sh-caption text-text-soft">Conversaciones</dt>
            <dd className="text-sh-block tabular-nums text-headline">{formatNumber(agent.conversations)}</dd>
          </div>
          <div>
            <dt className="text-sh-caption text-text-soft">Turnos</dt>
            <dd className="text-sh-block tabular-nums text-headline">{formatNumber(agent.turns)}</dd>
          </div>
          <div>
            <dt className="text-sh-caption text-text-soft">Costo</dt>
            <dd className="text-sh-block tabular-nums text-headline">{formatUsd(agent.cost_usd, 2)}</dd>
          </div>
        </dl>
        <p className="text-sh-caption text-text-soft">
          {agent.last_activity_at
            ? `Última actividad: ${formatDateTime(agent.last_activity_at)}`
            : "Sin actividad en los últimos 30 días"}
          {agent.incluye_sin_atribuir && " · incluye lo que atendió el asistente antes del Agent OS"}
        </p>
      </Link>
    </Card>
  );
}
