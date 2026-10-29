"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft } from "lucide-react";

import { ChannelIcon } from "@/components/domain/channel-icon";
import { MotivoBadge } from "@/components/domain/escalacion";
import { BinaryBadge, CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ConversationDetail, ConversationNote } from "@/lib/api/types";
import { useHiloEnVivo } from "@/lib/conversaciones/en-vivo";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";
import { useAction } from "@/lib/use-action";

import { conexionDelChat, nombreDelChat, tipoDelChat } from "./lista-de-chats";
import { AccionesDeCabecera, ComposerDeRespuesta } from "./conversation-actions";
import { DetalleDelTurno } from "./detalle-del-turno";
import { EnCurso } from "./en-curso";
import { MessageThread } from "./message-thread";

/** Mensajes que se pintan de entrada; el resto se suma al llegar al inicio del hilo. */
const VENTANA_MENSAJES = 60;

async function accion(conversationId: string, action: string, body?: Record<string, unknown>) {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: json.error, status: res.status };
}

/** Ticket de la escalación: motivo, resumen y quién la atiende. Las acciones viven en la cabecera. */
function Ticket({ detalle }: { detalle: ConversationDetail }) {
  const esc = detalle.escalation;
  if (!esc) return null;
  const atendida = esc.status === "asignada";

  return (
    <section
      aria-label="Escalación"
      className="flex flex-col gap-1.5 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <MotivoBadge esc={{ reason: "", reason_code: esc.reason_code, reason_label: esc.reason_label }} />
        <span className="text-sm text-headline">
          {atendida
            ? `La atiende ${esc.assigned_admin_email ?? "una persona del equipo"}`
            : "Esperando a una persona del equipo"}
        </span>
      </div>
      {esc.summary && <p className="text-sm text-body">{esc.summary}</p>}
    </section>
  );
}

/** Notas internas en una modal: solo el equipo las ve, nunca se envían al cliente. */
function NotasInternasDialog({
  open,
  onOpenChange,
  conversationId,
  notas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  notas: ConversationNote[];
}) {
  const [texto, setTexto] = useState("");
  const guardar = useAction();

  function enviar() {
    const limpio = texto.trim();
    if (!limpio) return;
    void guardar
      .run(async () => ({
        ...(await accion(conversationId, "note", { text: limpio })),
        success: "Nota guardada.",
      }))
      .then((ok) => {
        if (ok) setTexto("");
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Notas internas"
        description="Solo las ve el equipo; nunca se envían al cliente."
        className="max-w-xl"
      >
        <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1">
          {notas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-soft px-4 py-6 text-center text-sm text-text-soft">
              Sin notas todavía. Deja la primera para el equipo.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notas.map((nota, i) => (
                <li
                  key={`${nota.created_at ?? "nota"}-${i}`}
                  className="rounded-lg border border-border-soft bg-surface-2 px-3 py-2 text-sm"
                >
                  <p className="whitespace-pre-wrap break-words text-headline">{nota.text}</p>
                  <p className="mt-1 text-xs text-text-soft">
                    {nota.source === "human" ? (nota.author_email ?? "Equipo") : "Agente"}
                    {nota.created_at ? ` · ${formatDateTime(nota.created_at)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nota para el equipo (el cliente no la ve)…"
            aria-label="Nota interna"
            maxLength={2000}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={enviar}
              disabled={!texto.trim() || guardar.pending}
            >
              Guardar nota
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Columna derecha de la bandeja: el chat elegido, con el hilo que se actualiza solo. */
export function ChatAbierto({
  detalle,
  query,
  hrefVolver,
}: {
  detalle: ConversationDetail;
  query: string;
  hrefVolver: string;
}) {
  const mensajes = useHiloEnVivo(detalle.id, detalle.messages);
  const nombre = nombreDelChat(detalle);
  const atiendePersona = detalle.escalation?.status === "asignada";
  const puedeResponder =
    detalle.status !== "closed" && (atiendePersona || (detalle.bot_paused && detalle.escalation == null));
  const uso = detalle.usage ?? { cost_usd: 0, input_tokens: 0, output_tokens: 0, turns: 0 };
  const tokens = uso.input_tokens + uso.output_tokens;
  const [turnoAbierto, setTurnoAbierto] = useState<string | null>(null);
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const notas = detalle.notes ?? [];

  // La ficha del cliente se abre sobre la misma sección: conserva el chat y los filtros.
  const qsFicha = new URLSearchParams(query);
  qsFicha.set("c", detalle.id);
  if (detalle.customer_id) qsFicha.set("cliente", detalle.customer_id);
  const hrefFicha = detalle.customer_id
    ? `/conversaciones?${qsFicha.toString()}`
    : undefined;

  // Scroll infinito del hilo: se pinta una ventana final y se amplía al llegar arriba,
  // conservando la posición para que el texto no salte.
  const [ventana, setVentana] = useState(VENTANA_MENSAJES);
  const visibles = mensajes.length > ventana ? mensajes.slice(mensajes.length - ventana) : mensajes;
  const hayAnteriores = mensajes.length > visibles.length;
  const alturaPrevia = useRef<{ altura: number; scroll: number } | null>(null);
  const cargandoAnteriores = useRef(false);

  const hiloRef = useRef<HTMLDivElement>(null);
  const alFondoRef = useRef(true);
  const [hayNuevos, setHayNuevos] = useState(false);

  useEffect(() => {
    const hilo = hiloRef.current;
    if (!hilo) return;
    if (alFondoRef.current) {
      hilo.scrollTop = hilo.scrollHeight;
      setHayNuevos(false);
    } else {
      setHayNuevos(true);
    }
  }, [mensajes.length]);

  useLayoutEffect(() => {
    const hilo = hiloRef.current;
    const previa = alturaPrevia.current;
    if (!hilo || !previa) return;
    hilo.scrollTop = hilo.scrollHeight - previa.altura + previa.scroll;
    alturaPrevia.current = null;
  }, [ventana]);

  function cargarAnteriores() {
    const hilo = hiloRef.current;
    if (!hilo || !hayAnteriores || cargandoAnteriores.current) return;
    cargandoAnteriores.current = true;
    alturaPrevia.current = { altura: hilo.scrollHeight, scroll: hilo.scrollTop };
    setVentana((actual) => actual + VENTANA_MENSAJES);
    requestAnimationFrame(() => {
      cargandoAnteriores.current = false;
    });
  }

  function irAlFinal() {
    const hilo = hiloRef.current;
    if (!hilo) return;
    hilo.scrollTo({ top: hilo.scrollHeight, behavior: "smooth" });
    alFondoRef.current = true;
    setHayNuevos(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-start gap-3 border-b border-border-soft px-4 py-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 lg:hidden">
          <Link href={hrefVolver} scroll={false}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <Avatar name={nombre} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="truncate font-display text-sh-block text-headline">{nombre}</h2>
            <span
              className="ml-auto shrink-0 text-xs tabular-nums text-text-soft"
              title="Costo y tokens de la conversación"
            >
              {formatUsd(uso.cost_usd)} · {formatNumber(tokens)} tokens
            </span>
          </div>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 break-all text-xs text-text-soft">
            <ChannelIcon id={tipoDelChat(detalle)} size="sm" />
            {conexionDelChat(detalle)}
            {detalle.external_id ? ` · ${detalle.external_id}` : ""}
          </span>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <StatusBadge value={detalle.status} map={CONVERSATION_STATUS} />
            <BinaryBadge
              active={!detalle.bot_paused}
              activeLabel="Agente activo"
              inactiveLabel="Agente pausado"
            />
          </div>
        </div>
        <AccionesDeCabecera
          conversationId={detalle.id}
          botPaused={detalle.bot_paused}
          status={detalle.status}
          escalation={detalle.escalation}
          hrefFicha={hrefFicha}
          notas={notas.length}
          onAbrirNotas={() => setNotasAbiertas(true)}
        />
      </header>

      {detalle.escalation && (
        <div className="max-h-[32%] shrink-0 overflow-y-auto border-b border-border-soft px-4 py-3">
          <Ticket detalle={detalle} />
          <div className="mt-3">
            <EnCurso conversationId={detalle.id} estadoEscalacion={detalle.escalation.status} />
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={hiloRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const alFondo = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            alFondoRef.current = alFondo;
            if (alFondo) setHayNuevos(false);
            if (el.scrollTop < 80 && hayAnteriores) cargarAnteriores();
          }}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4"
          aria-live="polite"
          aria-relevant="additions"
        >
          {hayAnteriores && (
            <div className="flex justify-center pb-1">
              <Button type="button" variant="ghost" size="sm" onClick={cargarAnteriores}>
                Ver mensajes anteriores
              </Button>
            </div>
          )}
          <MessageThread messages={visibles} onVerTurno={setTurnoAbierto} />
        </div>
        {hayNuevos && (
          <button
            type="button"
            onClick={irAlFinal}
            className="absolute bottom-3 right-4 inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-surface px-3 py-1.5 text-xs font-medium text-headline shadow-elev-2 transition-colors hover:bg-hover focus-visible:outline-2"
          >
            <ArrowDown aria-hidden className="h-3.5 w-3.5" />
            Mensajes nuevos
          </button>
        )}
      </div>

      <div className="shrink-0 border-t border-border-soft px-4 py-3">
        {puedeResponder ? (
          <ComposerDeRespuesta conversationId={detalle.id} />
        ) : (
          <p className="text-sm text-text-soft">
            {detalle.status === "closed"
              ? "Esta conversación está cerrada."
              : detalle.escalation?.status === "pendiente"
                ? "Toma la conversación para responder como persona."
                : "El agente está atendiendo esta conversación. Pausa el agente para escribir como persona."}
          </p>
        )}
      </div>
      <NotasInternasDialog
        open={notasAbiertas}
        onOpenChange={setNotasAbiertas}
        conversationId={detalle.id}
        notas={notas}
      />
      <DetalleDelTurno turnId={turnoAbierto} onClose={() => setTurnoAbierto(null)} />
    </div>
  );
}
