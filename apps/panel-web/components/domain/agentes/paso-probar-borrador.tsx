"use client";

import { ChatPrueba } from "@/app/(app)/asistente/_components/chat-prueba";

/**
 * «Pruébalo» de la creación de agentes (SPEC-45, HU-AOS-72): conversa con el borrador recién creado sin
 * publicarlo. El turno va directo a ese agente, con las acciones simuladas y sin versión, release ni
 * instancia (adenda HU-AOS-72 de ADR-0191). Las frases salen de lo cargado en «Datos».
 */
export function PasoProbarBorrador({ agenteId, sugerencias }: { agenteId: string; sugerencias: string[] }) {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <p className="text-body">
        Escríbele como si fueras un cliente. Le hablas al borrador: no se publica, no se envía nada y los pedidos o cobros
        que haga son simulados.
      </p>
      <ChatPrueba agenteId={agenteId} sugerencias={sugerencias} />
    </div>
  );
}
