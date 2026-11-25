import Link from "next/link";

import { AgentIcon } from "@/components/domain/agent-icon";
import { Button } from "@/components/ui/button";
import { rutaDePersonalizar } from "@/lib/rutas-de-agente";

/**
 * El Coordinador no sale en el resumen de agentes (es el que recibe y reparte, no un especialista), pero tiene su
 * ficha y sus opciones propias (ADR-0211, HU-AOS-98). Esta fila es la puerta: abre su ficha y, con permiso, Personalizar.
 */
export function CoordinadorEnLaLista({ id, nombre, puedeEditar }: { id: string; nombre: string; puedeEditar: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
      <Link href={`/agentes/${id}`} className="flex min-w-0 items-center gap-3">
        <AgentIcon agentKey="coordinador" name={nombre} />
        <span className="flex min-w-0 flex-col">
          <span className="font-medium text-headline">{nombre}</span>
          <span className="text-xs text-text-soft">Recibe cada conversación y la reparte al agente que sabe</span>
        </span>
      </Link>
      {puedeEditar && (
        <Button asChild variant="accent">
          <Link href={rutaDePersonalizar(id)}>Personalizar</Link>
        </Button>
      )}
    </div>
  );
}
