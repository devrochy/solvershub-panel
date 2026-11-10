"use client";

import { useRef, useState } from "react";
import {
  Bot,
  FileText,
  Hand,
  Info,
  MoreVertical,
  NotebookPen,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Contador } from "@/components/ui/contador";
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
import { formatNumber, formatUsd } from "@/lib/format";
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

/** La acción principal de una escalación pendiente: va en el pie, donde después se responde. */
export function TomarConversacion({ conversationId }: { conversationId: string }) {
  const actuar = useAction();
  return (
    <Button
      type="button"
      variant="accent"
      size="lg"
      className="w-full sm:h-10 sm:w-auto sm:px-4"
      loading={actuar.pending}
      onClick={() =>
        void actuar.run(async () => ({
          ...(await accion(conversationId, "take")),
          success: "Tomaste la conversación. El agente queda en pausa en este chat.",
        }))
      }
    >
      {!actuar.pending && <Hand aria-hidden className="h-4 w-4" />}
      Tomar conversación
    </Button>
  );
}

/** Con la conversación tomada, devolverla va en el aviso de la escalación. */
export function DevolverAlAgente({ conversationId }: { conversationId: string }) {
  const confirm = useConfirm();
  const actuar = useAction();

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

  return (
    <Button type="button" variant="outline" className="shrink-0" loading={actuar.pending} onClick={() => void devolver()}>
      Devolver al agente
    </Button>
  );
}

/**
 * Acciones de la conversación en la cabecera (HIG: barra de acciones con iconos y
 * *overflow* para lo secundario): interruptor del agente, notas y menú.
 * Cada acción refleja el estado real del chat: «Resolver» solo aparece si está escalada.
 */
export function AccionesDeCabecera({
  conversationId,
  botPaused,
  status,
  escalation,
  hrefFicha,
  notas,
  onAbrirNotas,
  externalId,
  uso,
}: {
  conversationId: string;
  botPaused: boolean;
  status: string;
  escalation: ConversationDetail["escalation"];
  /** Ficha del cliente dentro de Conversaciones (conserva el chat y los filtros). */
  hrefFicha?: string;
  notas: number;
  onAbrirNotas: () => void;
  externalId?: string | null;
  uso: { cost_usd: number; input_tokens: number; output_tokens: number };
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
  const [detalles, setDetalles] = useState(false);

  const asignada = escalation?.status === "asignada";
  const puedeResponder =
    status !== "closed" && (asignada || (pausado && escalation == null));

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
          {notas > 0 && <Contador valor={notas} tamano="sm" className="absolute -right-0.5 -top-0.5" />}
        </Button>
      </Tooltip>

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
          <DropdownMenuItem icon={<Info />} onSelect={() => setDetalles(true)}>
            Detalles de la conversación
          </DropdownMenuItem>
          {status === "escalated" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem icon={<ShieldCheck />} tone="danger" onSelect={() => void resolver()}>
                Resolver conversación
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={detalles} onOpenChange={setDetalles}>
        <DialogContent title="Detalles de la conversación" className="max-w-md">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
            <dt className="text-text-soft">Identificador externo</dt>
            <dd className="break-all text-headline">{externalId ?? "—"}</dd>
            <dt className="text-text-soft">Costo</dt>
            <dd className="tabular-nums text-headline">{formatUsd(uso.cost_usd)}</dd>
            <dt className="text-text-soft">Tokens</dt>
            <dd className="tabular-nums text-headline">{formatNumber(uso.input_tokens + uso.output_tokens)} tokens</dd>
          </dl>
        </DialogContent>
      </Dialog>

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
    <div className="group/composer flex flex-col gap-1.5">
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
          disabled={!contenido.trim()}
          loading={enviando}
          aria-label="Enviar mensaje"
        >
          {!enviando && <Send aria-hidden className="h-5 w-5" />}
        </Button>
      </div>
      <p className="hidden px-1 text-xs text-text-soft group-focus-within/composer:block">
        Enter envía · Shift + Enter hace un salto de línea.
      </p>
    </div>
  );
}
