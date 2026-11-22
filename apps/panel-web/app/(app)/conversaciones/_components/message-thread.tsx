import { Bot, MessageSquare, Mic, SearchCode, Wrench } from "lucide-react";

import type { MessageItem } from "@/lib/api/types";
import { formatDate, formatHoraChat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { textoDeNoEnviado } from "@/lib/motivo-no-enviado";

const SENDER_LABEL: Record<string, string> = {
  customer: "Cliente",
  agent: "Agente",
  human: "Equipo",
};

const PREFIJO_DEL_DIA = "Conversación del ";

function claveDeDia(fecha: string): string {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** «Hoy», «Ayer» o la fecha corta, como en las apps de mensajería. */
function textoDeDia(fecha: string, ahora: Date = new Date()): string {
  const dia = new Date(fecha);
  const hoy = new Date(ahora);
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (dia.toDateString() === hoy.toDateString()) return "Hoy";
  if (dia.toDateString() === ayer.toDateString()) return "Ayer";
  return `${PREFIJO_DEL_DIA}${formatDate(fecha)}`;
}

const PLACEHOLDERS_DE_MEDIA = new Set([
  "[Nota de voz]",
  "[Imagen]",
  "[Imagen adjunta]",
  "[Archivo adjunto]",
]);

/** Texto que se muestra junto al media: un caption real, nunca el placeholder del canal. */
function textoVisible(message: MessageItem): string {
  if (!message.media_type) return message.content;
  const texto = message.content.trim();
  if (!texto || PLACEHOLDERS_DE_MEDIA.has(texto)) return "";
  return message.content;
}

/** Audio, imagen o archivo del mensaje (ADR-0196/0197). */
function MediaDelMensaje({ message, inbound }: { message: MessageItem; inbound: boolean }) {
  const tipo = message.media_type ?? "";
  const url = message.media_url ?? undefined;
  if (!tipo) return null;

  if (tipo === "audio/tts") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs italic opacity-80">
        <Mic aria-hidden className="h-3.5 w-3.5" />
        Preparando nota de voz…
      </span>
    );
  }

  if (tipo.startsWith("audio/")) {
    if (!url) {
      return <span className="text-xs italic opacity-80">Nota de voz no disponible.</span>;
    }
    return (
      <div className="flex flex-col gap-1.5">
        <audio
          controls
          preload="none"
          src={url}
          aria-label={inbound ? "Nota de voz del cliente" : "Nota de voz del agente"}
          className="h-9 max-w-full"
        >
          Tu navegador no puede reproducir este audio.
        </audio>
        {message.media_transcription &&
          (inbound ? (
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed opacity-80">
              {message.media_transcription}
            </p>
          ) : (
            <details className="text-xs opacity-80">
              <summary className="cursor-pointer select-none">Ver transcripción</summary>
              <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                {message.media_transcription}
              </p>
            </details>
          ))}
      </div>
    );
  }

  if (tipo === "image" || tipo.startsWith("image/")) {
    if (!url) {
      return <span className="text-xs italic opacity-80">Imagen no disponible.</span>;
    }
    return (
      <figure className="flex flex-col gap-1.5">
        <a href={url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={url}
            alt={message.media_transcription ? `Imagen: ${message.media_transcription}` : "Imagen del mensaje"}
            loading="lazy"
            className="max-h-80 max-w-full rounded-lg object-contain"
          />
        </a>
        {inbound && message.media_transcription && (
          <details className="text-xs opacity-80">
            <summary className="cursor-pointer select-none">Descripción automática</summary>
            <p className="mt-1 leading-relaxed">{message.media_transcription}</p>
          </details>
        )}
      </figure>
    );
  }

  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium underline underline-offset-2"
    >
      Abrir archivo
    </a>
  );
}

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

type Fila =
  | { tipo: "dia"; clave: string; texto: string }
  | { tipo: "mensaje"; mensaje: MessageItem; continuo: boolean };

/** Intercala separadores de día y marca los mensajes seguidos del mismo remitente. */
function armarFilas(messages: MessageItem[]): Fila[] {
  const filas: Fila[] = [];
  let diaAnterior: string | null = null;
  let anterior: MessageItem | null = null;

  for (const mensaje of messages) {
    const dia = claveDeDia(mensaje.created_at);
    if (dia !== diaAnterior) {
      filas.push({ tipo: "dia", clave: `dia-${dia}`, texto: textoDeDia(mensaje.created_at) });
      diaAnterior = dia;
      anterior = null;
    }
    const mismoRemitente = anterior?.sender_type === mensaje.sender_type;
    const cerca =
      anterior != null &&
      Date.parse(mensaje.created_at) - Date.parse(anterior.created_at) < 5 * 60_000;
    filas.push({ tipo: "mensaje", mensaje, continuo: Boolean(mismoRemitente && cerca) });
    anterior = mensaje;
  }
  return filas;
}

/**
 * Hilo de mensajes: entrante a la izquierda, saliente a la derecha, con separadores de día.
 * Con `onVerTurno`, cada mensaje del agente ofrece abrir el depurador de su turno (HU-AOS-28).
 */
export function MessageThread({
  messages,
  onVerTurno,
}: {
  messages: MessageItem[];
  onVerTurno?: (turnId: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="my-auto flex flex-col items-center gap-2 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-soft">
          <MessageSquare aria-hidden className="h-4 w-4" />
        </span>
        <p className="text-sm text-text-soft">Aún no hay mensajes en esta conversación.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {armarFilas(messages).map((fila) =>
        fila.tipo === "dia" ? (
          <div key={fila.clave} className="flex items-center gap-3 py-1" role="separator">
            <span aria-hidden className="h-px flex-1 bg-border-soft" />
            <span className="text-xs font-medium text-text-soft">{fila.texto}</span>
            <span aria-hidden className="h-px flex-1 bg-border-soft" />
          </div>
        ) : (
          <MensajeDelHilo
            key={fila.mensaje.id}
            message={fila.mensaje}
            continuo={fila.continuo}
            onVerTurno={onVerTurno}
          />
        ),
      )}
    </div>
  );
}

function MensajeDelHilo({
  message,
  continuo,
  onVerTurno,
}: {
  message: MessageItem;
  continuo: boolean;
  onVerTurno?: (turnId: string) => void;
}) {
  const inbound = message.direction === "inbound";
  const remitente = SENDER_LABEL[message.sender_type] ?? message.sender_type;
  const esAgente = !inbound && message.sender_type !== "human";

  return (
    <div
      className={cn(
        "flex max-w-[78%] flex-col gap-1 xl:max-w-[44rem]",
        inbound ? "self-start" : "items-end self-end",
        continuo ? "mt-0" : "mt-1",
      )}
    >
      {!continuo && (
        <span className="inline-flex items-center gap-1 px-1 text-xs text-text-soft">
          {esAgente && <Bot aria-hidden className="h-3 w-3" />}
          {remitente} · {formatHoraChat(message.created_at)}
        </span>
      )}
      <div
        className={cn(
          "whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-2.5 text-sm shadow-elev-0",
          inbound && "rounded-bl-md bg-surface-2 text-headline",
          esAgente && "rounded-tr-md bg-surface-raised text-headline ring-1 ring-inset ring-border",
          !inbound && !esAgente && "rounded-tr-md bg-action text-white",
        )}
      >
        {message.media_type && (
          <MediaDelMensaje message={message} inbound={inbound} />
        )}
        {textoVisible(message) ? (
          <div className={cn(message.media_type && "mt-1.5")}>{textoVisible(message)}</div>
        ) : (
          !message.media_type && <span className="italic opacity-70">(sin texto)</span>
        )}
      </div>
      {((message.tool_calls?.length ?? 0) > 0 || (onVerTurno && message.turn_id)) && (
        <div className="flex flex-wrap items-center gap-3 px-1">
          {(message.tool_calls?.length ?? 0) > 0 && (
            <HerramientasDelTurno nombres={message.tool_calls ?? []} />
          )}
          {onVerTurno && message.turn_id && (
            <button
              type="button"
              onClick={() => onVerTurno(message.turn_id as string)}
              className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-link hover:underline focus-visible:outline-2"
            >
              <SearchCode aria-hidden className="h-3 w-3" />
              Ver turno
            </button>
          )}
        </div>
      )}
      {message.template_name && (
        <span className="px-1 text-xs text-text-soft">Plantilla: {message.template_name}</span>
      )}
      {message.status === "failed" && (
        <span className="px-1 text-xs text-status-danger-fg">
          {textoDeNoEnviado(message.error_reason)}
        </span>
      )}
    </div>
  );
}
