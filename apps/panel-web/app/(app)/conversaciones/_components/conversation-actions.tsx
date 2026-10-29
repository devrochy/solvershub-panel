"use client";

import { useRef, useState } from "react";
import {
  Bot,
  FileText,
  Hand,
  Loader2,
  MoreVertical,
  NotebookPen,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import type { ConversationDetail } from "@/lib/api/types";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

import { TemplatePicker } from "./template-picker";

async function accion(conversationId: string, action: string, body?: Record<string, unknown>) {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  return { ok: res.ok, error: json.error, status: res.status, code: json.code };
}

/**
 * Acciones de la conversación en la cabecera (HIG: barra de acciones con iconos y
 * *overflow* para lo secundario): tomar/devolver, interruptor del agente, notas y menú.
 * Cada botón refleja el estado real del chat: «Resolver» solo aparece si está escalada.
 */
export function AccionesDeCabecera({
  conversationId,
  botPaused,
  status,
  escalation,
  hrefFicha,
  notas,
  onAbrirNotas,
}: {
  conversationId: string;
  botPaused: boolean;
  status: string;
  escalation: ConversationDetail["escalation"];
  /** Ficha del cliente dentro de Conversaciones (conserva el chat y los filtros). */
  hrefFicha?: string;
  notas: number;
  onAbrirNotas: () => void;
}) {
  const confirm = useConfirm();
  const actuar = useAction();
  const [pausado, setPausado] = useState(botPaused);
  // Tomar o devolver cambia la pausa desde el servidor: se sigue a la prop.
  const [pausaDelServidor, setPausaDelServidor] = useState(botPaused);
  if (pausaDelServidor !== botPaused) {
    setPausaDelServidor(botPaused);
    setPausado(botPaused);
  }
  const [plantillas, setPlantillas] = useState(false);

  const pendiente = escalation?.status === "pendiente";
  const asignada = escalation?.status === "asignada";
  const puedeResponder =
    status !== "closed" && (asignada || (pausado && escalation == null));
  const hayMenu = puedeResponder || Boolean(hrefFicha) || status === "escalated";

  async function tomar() {
    await actuar.run(async () => ({
      ...(await accion(conversationId, "take")),
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
      ...(await accion(conversationId, "return-to-bot")),
      success: "El agente vuelve a atender esta conversación.",
    }));
  }

  async function alternarAgente() {
    const antes = pausado;
    setPausado(!antes);
    const ok = await actuar.run(() => accion(conversationId, "toggle-bot"));
    if (!ok) setPausado(antes);
  }

  async function resolver() {
    const aceptado = await confirm({
      title: "Resolver conversación",
      description:
        "Se cerrará la conversación y el cliente dejará de recibir respuestas del asistente.",
      confirmLabel: "Resolver",
      destructive: true,
    });
    if (!aceptado) return;
    await actuar.run(() => accion(conversationId, "resolve"));
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {pendiente && (
        <Tooltip label="Tomar la conversación" focusable={false}>
          <Button
            type="button"
            variant="accent"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => void tomar()}
            disabled={actuar.pending}
            aria-label="Tomar la conversación"
          >
            <Hand aria-hidden className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}

      {asignada && (
        <Tooltip label="Devolver al agente" focusable={false}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => void devolver()}
            disabled={actuar.pending}
            aria-label="Devolver al agente"
          >
            <Bot aria-hidden className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}

      {escalation == null && status !== "closed" && (
        <Tooltip label={pausado ? "Reanudar el agente" : "Pausar el agente"} focusable={false}>
          <span className="flex h-10 items-center gap-2 rounded-full border border-border-soft bg-surface px-2.5">
            <Bot
              aria-hidden
              className={cn("h-4 w-4", pausado ? "text-text-soft" : "text-status-success-fg")}
            />
            <Switch
              checked={!pausado}
              onCheckedChange={() => void alternarAgente()}
              disabled={actuar.pending}
              tone="success"
              aria-label={pausado ? "Reanudar el agente" : "Pausar el agente"}
            />
          </span>
        </Tooltip>
      )}

      <Tooltip label="Notas internas" focusable={false}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full"
          onClick={onAbrirNotas}
          aria-label={`Notas internas${notas ? ` (${notas})` : ""}`}
        >
          <NotebookPen aria-hidden className="h-4 w-4" />
          {notas > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-semibold tabular-nums text-white"
            >
              {notas}
            </span>
          )}
        </Button>
      </Tooltip>

      {hayMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              aria-label="Más acciones de la conversación"
            >
              <MoreVertical aria-hidden className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {puedeResponder && (
              <DropdownMenuItem icon={<FileText />} onSelect={() => setPlantillas(true)}>
                Enviar plantilla
              </DropdownMenuItem>
            )}
            {hrefFicha && (
              <DropdownMenuLinkItem href={hrefFicha}>
                <UserRound aria-hidden className="h-4 w-4" />
                Ver ficha del cliente
              </DropdownMenuLinkItem>
            )}
            {status === "escalated" && (
              <>
                {(puedeResponder || hrefFicha) && <DropdownMenuSeparator />}
                <DropdownMenuItem icon={<ShieldCheck />} tone="danger" onSelect={() => void resolver()}>
                  Resolver conversación
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={plantillas} onOpenChange={setPlantillas}>
        <DialogContent
          title="Enviar plantilla"
          description="WhatsApp solo permite plantillas aprobadas fuera de la ventana de 24 h."
          className="max-w-xl"
        >
          <TemplatePicker conversationId={conversationId} onSent={() => setPlantillas(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Caja de respuesta del equipo: campo ancho y envío con icono, como en una app de mensajería. */
export function ComposerDeRespuesta({ conversationId }: { conversationId: string }) {
  const [contenido, setContenido] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ventanaVencida, setVentanaVencida] = useState(false);
  const campoRef = useRef<HTMLTextAreaElement>(null);
  const enviar = useAction();

  function ajustarAltura(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  function mandar() {
    const texto = contenido.trim();
    if (!texto || enviando) return;
    setEnviando(true);
    void enviar
      .run(async () => {
        const resultado = await accion(conversationId, "message", { content: texto });
        if (!resultado.ok && resultado.code === "window_expired") setVentanaVencida(true);
        return { ...resultado, success: "Mensaje enviado." };
      })
      .then((ok) => {
        if (ok) {
          setContenido("");
          if (campoRef.current) campoRef.current.style.height = "";
        }
      })
      .finally(() => setEnviando(false));
  }

  return (
    <div className="flex flex-col gap-3">
      {ventanaVencida && (
        <TemplatePicker conversationId={conversationId} onSent={() => setVentanaVencida(false)} />
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-border-soft bg-bg-deep p-1.5 transition-colors focus-within:border-focus">
        <Textarea
          ref={campoRef}
          rows={1}
          value={contenido}
          onChange={(e) => {
            setContenido(e.target.value);
            ajustarAltura(e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              mandar();
            }
          }}
          placeholder="Escribe como persona del equipo…"
          aria-label="Mensaje para el cliente"
          maxLength={4000}
          className="min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm shadow-none focus-visible:outline-none"
        />
        <Button
          type="button"
          variant="accent"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          onClick={mandar}
          disabled={!contenido.trim() || enviando}
          aria-label="Enviar mensaje"
        >
          {enviando ? (
            <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
          ) : (
            <Send aria-hidden className="h-5 w-5" />
          )}
        </Button>
      </div>
      <p className="px-1 text-xs text-text-soft">Enter envía · Shift + Enter hace un salto de línea.</p>
    </div>
  );
}
