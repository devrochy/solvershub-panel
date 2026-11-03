import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AgentRetiredNotices, RetiredReferencesOut } from "@/lib/api/types";
import { etiquetaDeAviso, resumenDeLaLista, titularDelAgente } from "@/lib/referencias-retiradas";

/**
 * «Este agente nombra algo que ya no existe» (HU-AOS-59): el aviso del dueño en el editor. Es solo
 * lectura y en palabras simples (el `message` de la API, sin códigos). Si el borrador lo tiene, publicar
 * falla hasta quitarlo y se marca. Sin avisos no pinta nada.
 */
export function AvisoDeReferenciasRetiradas({ aviso, className }: { aviso: AgentRetiredNotices | null; className?: string }) {
  const titular = aviso ? titularDelAgente(aviso) : null;
  if (!aviso || !titular) return null;
  return (
    <section
      role="status"
      aria-label="Referencias retiradas"
      className={`flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-start gap-2 font-medium text-status-warning-fg">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {titular}
        </p>
        {aviso.blocks_publish && <Badge variant="danger">Bloquea publicar</Badge>}
      </div>
      <ul className="flex flex-col gap-2">
        {aviso.notices.map((n) => (
          <li key={`${n.scope}-${n.field}-${n.name}`} className="flex flex-col gap-0.5">
            <span className="text-xs text-text-soft">{etiquetaDeAviso(n.scope)}</span>
            <span className="text-headline">{n.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Aviso de la lista de agentes: cuántos tienen algo retirado y a cuál ir. */
export function AvisoDeReferenciasEnLista({ avisos }: { avisos: RetiredReferencesOut | null }) {
  if (!avisos || avisos.affected_agents === 0) return null;
  return (
    <section
      role="status"
      aria-label="Referencias retiradas"
      className="flex flex-col gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm"
    >
      <p className="flex items-start gap-2 font-medium text-status-warning-fg">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {resumenDeLaLista(avisos.affected_agents)}
      </p>
      <ul className="flex flex-col gap-1.5">
        {avisos.agents.map((a) => (
          <li key={a.agent_id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-headline">{a.name}</span>
            {a.blocks_publish && <Badge variant="danger">Bloquea publicar</Badge>}
            <Link className="text-link underline" href={`/agentes/${a.agent_id}/editar`}>
              Revisar en el editor
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
