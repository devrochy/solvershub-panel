"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Hand } from "lucide-react";

import { ChannelIcon } from "@/components/domain/channel-icon";
import { MotivoBadge } from "@/components/domain/escalacion";
import { BinaryBadge, CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Textarea } from "@/components/ui/textarea";
import type { ConversationDetail, ConversationNote } from "@/lib/api/types";
import { useHiloEnVivo } from "@/lib/conversaciones/en-vivo";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";
import { useAction } from "@/lib/use-action";

import { conexionDelChat, nombreDelChat, tipoDelChat } from "./lista-de-chats";
import { ConversationActions } from "./conversation-actions";
import { DetalleDelTurno } from "./detalle-del-turno";
import { EnCurso } from "./en-curso";
import { MessageThread } from "./message-thread";

async function accion(conversationId: string, action: string, body?: Record<string, unknown>) {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: json.error, status: res.status };
}

/** El ticket del chat: motivo, resumen, quién atiende y las acciones de tomar o devolver. */
function Ticket({ detalle }: { detalle: ConversationDetail }) {
  const confirm = useConfirm();
  const actuar = useAction();
  const esc = detalle.escalation;
  if (!esc) return null;
  const atendida = esc.status === "asignada";

  async function tomar() {
    await actuar.run(async () => ({
      ...(await accion(detalle.id, "take")),
      success: "Tomaste la conversación. El agente queda en pausa en este chat.",
    }));
  }

  async function devolver() {
    const aceptado = await confirm({
      title: "Devolver al agente",
      description:
        "Se cierra la atención de una persona y el agente vuelve a responder en esta conversación.",
      confirmLabel: "Devolver al agente",
    });
    if (!aceptado) return;
    await actuar.run(async () => ({
      ...(await accion(detalle.id, "return-to-bot")),
      success: "El agente vuelve a atender esta conversación.",
    }));
  }

  return (
    <section
      aria-label="Escalación"
      className="flex flex-col gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <MotivoBadge esc={{ reason: "", reason_code: esc.reason_code, reason_label: esc.reason_label }} />
        <span className="text-sm text-headline">
          {atendida
            ? `La atiende ${esc.assigned_admin_email ?? "una persona del equipo"}`
            : "Esperando a una persona del equipo"}
        </span>
        <span className="ml-auto flex gap-2">
          {!atendida && (
            <Button type="button" size="sm" variant="accent" onClick={() => void tomar()} disabled={actuar.pending}>
              <Hand aria-hidden className="h-4 w-4" />
              Tomar
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => void devolver()} disabled={actuar.pending}>
            <Bot aria-hidden className="h-4 w-4" />
            Devolver al agente
          </Button>
        </span>
      </div>
      {esc.summary && <p className="text-sm text-body">{esc.summary}</p>}
    </section>
  );
}

/** Notas internas del equipo y del agente. Nunca se envían al cliente. */
function NotasInternas({ conversationId, notas }: { conversationId: string; notas: ConversationNote[] }) {
  const [texto, setTexto] = useState("");
  const guardar = useAction();

  function enviar() {
    const limpio = texto.trim();
    if (!limpio) return;
    void guardar
      .run(async () => ({ ...(await accion(conversationId, "note", { text: limpio })), success: "Nota guardada." }))
      .then((ok) => {
        if (ok) setTexto("");
      });
  }

  return (
    <details>
      <summary className="cursor-pointer list-none rounded-sm text-sm font-semibold [&::-webkit-details-marker]:hidden text-headline focus-visible:outline-2">
        Notas internas{notas.length ? ` (${notas.length})` : ""}
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {notas.length === 0 ? (
          <p className="text-sm text-text-soft">Sin notas. Solo las ve el equipo.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notas.map((nota, i) => (
              <li key={i} className="rounded-md border border-border-soft bg-surface-2 px-3 py-2 text-sm">
                <p className="text-headline">{nota.text}</p>
                <p className="mt-1 text-xs text-text-soft">
                  {nota.source === "human" ? (nota.author_email ?? "Equipo") : "Agente"}
                  {nota.created_at ? ` · ${formatDateTime(nota.created_at)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Textarea
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nota para el equipo (el cliente no la ve)…"
          aria-label="Nota interna"
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={enviar} disabled={!texto.trim() || guardar.pending}>
            Guardar nota
          </Button>
        </div>
      </div>
    </details>
  );
}

/** Columna derecha de la bandeja: el chat elegido, con el hilo que se actualiza solo. */
export function ChatAbierto({ detalle, hrefVolver }: { detalle: ConversationDetail; hrefVolver: string }) {
  const mensajes = useHiloEnVivo(detalle.id, detalle.messages);
  const nombre = nombreDelChat(detalle);
  const atiendePersona = detalle.escalation?.status === "asignada";
  const uso = detalle.usage ?? { cost_usd: 0, input_tokens: 0, output_tokens: 0, turns: 0 };
  const tokens = uso.input_tokens + uso.output_tokens;
  const [turnoAbierto, setTurnoAbierto] = useState<string | null>(null);

  // Baja al último mensaje al abrir y cuando llega uno nuevo, salvo que la persona esté
  // leyendo más arriba.
  const hiloRef = useRef<HTMLDivElement>(null);
  const alFondoRef = useRef(true);
  useEffect(() => {
    const hilo = hiloRef.current;
    if (hilo && alFondoRef.current) hilo.scrollTop = hilo.scrollHeight;
  }, [mensajes.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3">
        <Button asChild variant="ghost" size="sm" className="lg:hidden">
          <Link href={hrefVolver} scroll={false}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <Avatar name={nombre} size="md" />
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate font-display text-sh-block text-headline">{nombre}</h2>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 break-all text-xs text-text-soft">
            <ChannelIcon id={tipoDelChat(detalle)} size="sm" />
            {conexionDelChat(detalle)}
            {detalle.external_id ? ` · ${detalle.external_id}` : ""}
            {detalle.customer_id && (
              <Link href={`/leads?cliente=${detalle.customer_id}`} className="text-link hover:underline">
                Ver ficha
              </Link>
            )}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <StatusBadge value={detalle.status} map={CONVERSATION_STATUS} />
          <BinaryBadge
            active={!detalle.bot_paused}
            activeLabel="Agente activo"
            inactiveLabel="Agente pausado"
          />
          <span className="text-xs tabular-nums text-text-soft" title="Costo y tokens de la conversación">
            {formatUsd(uso.cost_usd)} · {formatNumber(tokens)} tokens
          </span>
        </div>
      </header>

      {detalle.escalation && (
        // Con «En curso» puede crecer: se limita para no aplastar el hilo.
        <div className="max-h-[45%] shrink-0 overflow-y-auto border-b border-border-soft px-4 py-3">
          <Ticket detalle={detalle} />
          <div className="mt-3">
            <EnCurso conversationId={detalle.id} estadoEscalacion={detalle.escalation.status} />
          </div>
        </div>
      )}

      <div
        ref={hiloRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          alFondoRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        <MessageThread messages={mensajes} onVerTurno={setTurnoAbierto} />
      </div>

      <div className="flex max-h-[45%] shrink-0 flex-col gap-5 overflow-y-auto border-t border-border-soft px-4 py-4">
        {!atiendePersona && detalle.escalation == null && detalle.bot_paused && (
          <p className="text-sm text-text-soft">El agente está pausado en este chat y nadie lo atiende.</p>
        )}
        <ConversationActions
          conversationId={detalle.id}
          botPaused={detalle.bot_paused}
          status={detalle.status}
          showComposer={atiendePersona}
        />
        <NotasInternas conversationId={detalle.id} notas={detalle.notes ?? []} />
      </div>
      <DetalleDelTurno turnId={turnoAbierto} onClose={() => setTurnoAbierto(null)} />
    </div>
  );
}
