import Link from "next/link";

import { AgentIcon } from "@/components/domain/agent-icon";
import { cn } from "@/lib/utils";

export type AgenteDelSelector = { ref: string; key: string; name: string; published: boolean };

/**
 * Selector de agentes de la ficha (HU-UX-09): una insignia por agente para saltar de uno a otro
 * sin volver a la lista. El actual queda marcado con `aria-current`.
 */
export function SelectorDeAgentes({ agentes, actual }: { agentes: AgenteDelSelector[]; actual: string }) {
  if (agentes.length < 2) return null;
  return (
    <nav aria-label="Tus agentes">
      <ul className="flex flex-wrap gap-2">
        {agentes.map((a) => {
          const esActual = a.ref === actual;
          return (
            <li key={a.ref}>
              <Link
                href={`/agentes/${a.ref}`}
                aria-current={esActual ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-pill border py-1 pl-1 pr-3 text-sm transition-colors",
                  esActual
                    ? "border-focus bg-accent/12 font-medium text-headline"
                    : "border-border-soft text-body hover:border-border-strong hover:text-headline",
                )}
              >
                <AgentIcon agentKey={a.key} name={a.name} />
                {a.name}
                {!a.published && <span className="text-xs text-text-soft">· borrador</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
