"use client";

import { ChevronDown } from "lucide-react";

import { AgentIcon } from "@/components/domain/agent-icon";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLinkItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type AgenteDelSelector = { ref: string; key: string; name: string; published: boolean };

/**
 * Cambiar de agente desde el título de la ficha (AGT-02): un menú junto al nombre en vez de una fila
 * de insignias encima de las migas. El actual queda marcado.
 */
export function SelectorDeAgentes({ agentes, actual }: { agentes: AgenteDelSelector[]; actual: string }) {
  if (agentes.length < 2) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Cambiar de agente" title="Cambiar de agente">
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {agentes.map((a) => (
          <DropdownMenuLinkItem key={a.ref} href={`/agentes/${a.ref}`} current={a.ref === actual}>
            <span className="flex items-center gap-2">
              <AgentIcon agentKey={a.key} name={a.name} />
              {a.name}
              {!a.published && <span className="text-xs text-text-soft">· borrador</span>}
            </span>
          </DropdownMenuLinkItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
