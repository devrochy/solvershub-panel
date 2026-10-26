import { SearchCode, Wrench } from "lucide-react";

import type { MessageItem } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const SENDER_LABEL: Record<string, string> = {
  customer: "Cliente",
  agent: "Agente",
  human: "Equipo",
};

/** Herramientas que usó el agente en el turno, plegadas (HU-UX-15). */
function HerramientasDelTurno({ nombres }: { nombres: string[] }) {
  return (
    <details className="group text-xs text-text-soft">
      <summary className="inline-flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden gap-1 rounded-sm hover:text-headline focus-visible:outline-2">
        <Wrench aria-hidden className="h-3 w-3" />
        {nombres.length === 1 ? "Usó 1 herramienta" : `Usó ${nombres.length} herramientas`}
      </summary>
      <ul className="mt-1 flex flex-col gap-0.5 rounded-md border border-border-soft bg-surface-2 px-3 py-2 font-mono">
        {nombres.map((nombre, i) => (
          <li key={`${nombre}-${i}`}>{nombre}</li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Hilo de mensajes: entrante a la izquierda, saliente a la derecha. Con `onVerTurno`, cada mensaje del
 * agente ofrece abrir el depurador de su turno (HU-AOS-28).
 */
export function MessageThread({
  messages,
  onVerTurno,
}: {
  messages: MessageItem[];
  onVerTurno?: (turnId: string) => void;
}) {
  if (messages.length === 0) {
    return <p className="text-sm text-text-soft">Sin mensajes.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => {
        const inbound = message.direction === "inbound";
        return (
          <div
            key={message.id}
            className={cn(
              "flex max-w-[75%] flex-col gap-1",
              inbound ? "self-start" : "items-end self-end",
            )}
          >
            <span className="text-xs text-text-soft">
              {SENDER_LABEL[message.sender_type] ?? message.sender_type} ·{" "}
              {formatDateTime(message.created_at)}
            </span>
            <div
              className={cn(
                "rounded-lg px-4 py-2 text-sm",
                inbound
                  ? "bg-surface-2 text-headline"
                  : "bg-cta text-white",
              )}
            >
              {message.content || <span className="italic opacity-70">(sin texto)</span>}
            </div>
            {((message.tool_calls?.length ?? 0) > 0 || (onVerTurno && message.turn_id)) && (
              <div className="flex flex-wrap items-center gap-3">
                {(message.tool_calls?.length ?? 0) > 0 && <HerramientasDelTurno nombres={message.tool_calls ?? []} />}
                {onVerTurno && message.turn_id && (
                  <button
                    type="button"
                    onClick={() => onVerTurno(message.turn_id as string)}
                    className="inline-flex items-center gap-1 rounded-sm text-xs text-text-soft hover:text-headline focus-visible:outline-2"
                  >
                    <SearchCode aria-hidden className="h-3 w-3" />
                    Ver turno
                  </button>
                )}
              </div>
            )}
            {message.template_name && (
              <span className="text-xs text-text-soft">Plantilla: {message.template_name}</span>
            )}
            {message.status === "failed" && (
              <span className="text-xs text-status-danger-fg">
                {message.error_reason === "sin_plantilla"
                  ? "No enviado: el cliente llevaba más de 24 h sin escribir y el aviso no tiene plantilla."
                  : "No enviado."}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
