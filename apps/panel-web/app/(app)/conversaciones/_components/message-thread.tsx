import type { ConversationDetail } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const SENDER_LABEL: Record<string, string> = {
  customer: "Cliente",
  agent: "Agente",
  human: "Equipo",
};

/** Hilo de mensajes: entrante a la izquierda, saliente a la derecha. */
export function MessageThread({ messages }: { messages: ConversationDetail["messages"] }) {
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
                  : "bg-gradient-to-br from-blue to-accent text-white",
              )}
            >
              {message.content || <span className="italic opacity-70">(sin texto)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
