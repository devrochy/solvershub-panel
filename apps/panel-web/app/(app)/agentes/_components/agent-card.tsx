import Link from "next/link";

import { AgentIcon } from "@/components/domain/agent-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AgentOverviewItem } from "@/lib/api/types";
import { dondeAtiende, estadoDelAgente, papelDelAgente } from "@/lib/agentes";
import { creditos } from "@/lib/consumo";
import { formatNumber, formatUsd } from "@/lib/format";
import { tiempoRelativo } from "@/lib/notificaciones/tipos";

export type AgenteDeLaLista = {
  agente: AgentOverviewItem;
  proposito: string | null;
  /** Créditos del mes (solo si el plan los mide). */
  creditos: number | null;
  /** Dólares: solo para el master (el dueño ve créditos, como en Consumo y plan). */
  verCosto: boolean;
  conAviso: boolean;
};

/** Lo que hizo en 30 días en una línea: «48 conversaciones · 3.200 créditos este mes». */
export function loQueHizo({ agente, creditos: usados, verCosto }: AgenteDeLaLista): string {
  const partes = [`${formatNumber(agente.conversations)} ${agente.conversations === 1 ? "conversación" : "conversaciones"}`];
  if (usados !== null) partes.push(`${creditos(usados)} este mes`);
  if (verCosto && agente.cost_usd !== null) partes.push(formatUsd(agente.cost_usd, 2));
  return partes.join(" · ");
}

export function ultimaConversacion(agente: AgentOverviewItem): string {
  return agente.last_activity_at ? `Última conversación ${tiempoRelativo(agente.last_activity_at)}` : "Sin conversaciones en 30 días";
}

export function EstadoDelAgente({ agente }: { agente: AgentOverviewItem }) {
  const estado = estadoDelAgente(agente);
  return estado.tono === "neutral" ? <Badge variant="neutral">{estado.label}</Badge> : <Badge variant={estado.tono}>{estado.label}</Badge>;
}

/** Tarjeta de un agente en la cuadrícula (AGT-01): qué hace, dónde atiende y qué hizo en 30 días. */
export function AgentCard(props: AgenteDeLaLista) {
  const { agente, proposito, conAviso } = props;
  return (
    <Card className="relative flex w-full flex-col gap-3 p-5 transition-colors duration-150 hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AgentIcon agentKey={agente.key} name={agente.name} />
          <Link
            href={`/agentes/${agente.ref}`}
            className="min-w-0 font-display text-sh-block text-headline outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
          >
            {agente.name}
          </Link>
        </div>
        <EstadoDelAgente agente={agente} />
      </div>
      <p className="text-sm text-body">{papelDelAgente(agente, proposito)}</p>
      <p className="text-sh-caption text-text-soft">{dondeAtiende(agente.connections)}</p>
      {conAviso && (
        <div>
          <Badge variant="warning">Nombra algo retirado</Badge>
        </div>
      )}
      <div className="mt-auto flex flex-col gap-1 border-t border-border-soft pt-3">
        <p className="text-sm tabular-nums text-headline">{loQueHizo(props)}</p>
        <p className="text-sh-caption text-text-soft">{ultimaConversacion(agente)}</p>
      </div>
    </Card>
  );
}
