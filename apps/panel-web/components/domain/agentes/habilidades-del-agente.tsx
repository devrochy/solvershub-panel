"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronRight, Circle } from "lucide-react";

import { ConocimientoDelAgente } from "@/app/(app)/agentes/_components/conocimiento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AgentSkill, KnowledgeDocument, PaymentAccount } from "@/lib/api/types";
import { aplicarConocimiento, conocimientoDesdeContenido, usaConocimiento } from "@/lib/conocimiento";
import {
  CONOCIMIENTO,
  PAGOS,
  abiertaAlCargar,
  cuentaElegida,
  estadoDeHabilidad,
  etiquetaDeCuenta,
  pasosDeHabilidad,
  resumenDeHabilidad,
  textoDeHabilidad,
  type PasoDeHabilidad,
} from "@/lib/habilidades-del-agente";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";

const ESTADO: Record<ReturnType<typeof estadoDeHabilidad>, { texto: string; tono: "neutral" | "success" | "warning" }> = {
  sin_agregar: { texto: "Sin agregar", tono: "neutral" },
  lista: { texto: "Lista", tono: "success" },
  falta_configurar: { texto: "Falta configurar", tono: "warning" },
};

type Contenido = Record<string, unknown>;
type RespuestaBorrador = { error?: string; code?: string; lockVersion?: number; content?: Contenido };

/**
 * Habilidades que se agregan a uno o varios agentes (ADR-0190, HU-AOS-66): Pagos en línea y Conocimiento. Cada una es
 * una tarjeta: al prenderla se abre con los pasos que le faltan y su configuración (la cuenta Wompi; los documentos).
 * La habilidad se guarda en el acto en el agente; prender Conocimiento además deja la búsqueda en documentos en el
 * borrador, que hay que publicar. Captar leads se enciende en «Acciones».
 */
export function HabilidadesDelAgente({
  agenteId,
  nombre,
  inicial,
  cuentas,
  puedeEditar,
  borrador,
  usaPublicado,
  documentos,
  puedeEscribirDocumentos,
}: {
  agenteId: string;
  nombre: string;
  inicial: AgentSkill[];
  cuentas: PaymentAccount[];
  puedeEditar: boolean;
  /** El borrador del agente; sin él (no cargó) no se toca la búsqueda en documentos. */
  borrador: { content: Contenido; lockVersion: number } | null;
  /** La versión que ven los clientes ya busca en documentos. */
  usaPublicado: boolean;
  /** Documentos del agente; `null` si no cargaron. */
  documentos: KnowledgeDocument[] | null;
  puedeEscribirDocumentos: boolean;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [habilidades, setHabilidades] = useState(inicial);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [contenido, setContenido] = useState(borrador?.content ?? null);
  const [lock, setLock] = useState(borrador?.lockVersion ?? 0);
  const [nDocumentos, setNDocumentos] = useState(documentos?.length ?? 0);
  const usaEnBorrador = contenido ? usaConocimiento(contenido) : false;
  const ctx = { cuentas, usaEnBorrador, usaPublicado, documentos: nDocumentos };
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(inicial.map((h) => [h.pack_id, abiertaAlCargar(h, pasosDeHabilidad(h, ctx))])),
  );
  const alCambiarDocumentos = useCallback((n: number) => setNDocumentos(n), []);

  async function guardarHabilidad(packId: string, installed: boolean, config?: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/agent-editor/${agenteId}/skills/${packId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installed, ...(config ? { config } : {}) }),
    });
    const data = (await res.json().catch(() => null)) as AgentSkill | { error?: string } | null;
    if (!res.ok || !data || "error" in data) {
      toast.error((data && "error" in data && data.error) || "No se pudo guardar la habilidad.");
      return false;
    }
    setHabilidades((todas) => todas.map((h) => (h.pack_id === packId ? (data as AgentSkill) : h)));
    return true;
  }

  /** Pone o quita la búsqueda en documentos en el borrador. Devuelve si quedó guardada. */
  async function guardarBusqueda(activo: boolean): Promise<boolean> {
    if (!contenido) {
      toast.error("No pudimos leer el borrador del agente. Recarga la página.");
      return false;
    }
    const nuevo = aplicarConocimiento(contenido, { ...conocimientoDesdeContenido(contenido), activo });
    const res = await fetch(`/api/agent-editor/${agenteId}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: nuevo, lock_version: lock }),
    });
    const json = (await res.json().catch(() => ({}))) as RespuestaBorrador;
    if (!res.ok) {
      if (json.code === "stale_lock_version") {
        toast.error("El borrador cambió mientras lo veías. Ya lo recargamos: vuelve a intentarlo.");
        router.refresh();
      } else {
        toast.error(json.error ?? "No se pudo guardar el borrador.");
      }
      return false;
    }
    setContenido(json.content ?? nuevo);
    setLock(json.lockVersion ?? lock);
    // Los superpoderes de la misma pestaña editan el mismo borrador: se remontan con el lock nuevo.
    router.refresh();
    return true;
  }

  async function alternar(h: AgentSkill, prender: boolean) {
    if (!prender) {
      const { nombre: habilidad } = textoDeHabilidad(h.pack_id);
      const ok = await confirmar({
        title: `¿Quitar «${habilidad}» de ${nombre}?`,
        description:
          h.pack_id === CONOCIMIENTO
            ? `${nombre} dejará de responder con los documentos cuando publiques. Los documentos no se borran.`
            : `${nombre} dejará de usar esta habilidad. Puedes volver a agregarla cuando quieras.`,
        confirmLabel: "Quitar habilidad",
      });
      if (!ok) return;
    }
    setGuardando(h.pack_id);
    try {
      if (!(await guardarHabilidad(h.pack_id, prender))) return;
      setAbiertas((a) => ({ ...a, [h.pack_id]: prender }));
      if (h.pack_id === CONOCIMIENTO && usaEnBorrador !== prender) {
        const ok = await guardarBusqueda(prender);
        if (ok && prender) {
          toast.success("Conocimiento agregado. Publica para que empiece a responder con los documentos.");
          return;
        }
        if (!ok) return;
      }
      toast.success(prender ? "Habilidad agregada." : "Habilidad quitada.");
    } finally {
      setGuardando(null);
    }
  }

  async function activarBusqueda() {
    setGuardando(CONOCIMIENTO);
    try {
      if (await guardarBusqueda(true)) toast.success("Guardado en el borrador. Publica para que tus clientes lo vean.");
    } finally {
      setGuardando(null);
    }
  }

  async function elegirCuenta(cuentaId: string) {
    setGuardando(PAGOS);
    try {
      if (await guardarHabilidad(PAGOS, true, { cuenta_id: cuentaId })) toast.success("Cuenta guardada.");
    } finally {
      setGuardando(null);
    }
  }

  if (habilidades.length === 0) {
    return <p className="text-sm text-text-soft">No hay habilidades para agregar a este agente.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {habilidades.map((h) => {
        const pasos = pasosDeHabilidad(h, ctx);
        const ocupado = guardando === h.pack_id;
        return (
          <TarjetaDeHabilidad
            key={h.pack_id}
            habilidad={h}
            pasos={pasos}
            abierta={Boolean(abiertas[h.pack_id]) && h.installed}
            onAbrir={(valor) => setAbiertas((a) => ({ ...a, [h.pack_id]: valor }))}
            onAlternar={(valor) => void alternar(h, valor)}
            puedeEditar={puedeEditar}
            ocupado={ocupado}
          >
            <Pasos
              pasos={pasos}
              accion={(p) =>
                p.id === "responde" && !p.hecho && puedeEditar ? (
                  <Button size="sm" variant="outline" onClick={() => void activarBusqueda()} loading={ocupado} disabled={ocupado}>
                    Activar
                  </Button>
                ) : p.id === "responde" && p.sinPublicar && puedeEditar ? (
                  <Button asChild size="sm" variant="accent">
                    <Link href={`/agentes/${agenteId}/editar?paso=publicar`}>Publicar cambios</Link>
                  </Button>
                ) : null
              }
            />
            {h.pack_id === PAGOS && (
              <CuentaDePagos
                h={h}
                cuentas={cuentas}
                disabled={!puedeEditar || ocupado}
                onElegir={(id) => void elegirCuenta(id)}
              />
            )}
            {h.pack_id === CONOCIMIENTO && (
              <div className="flex flex-col gap-3">
                {documentos ? (
                  <ConocimientoDelAgente
                    agenteId={agenteId}
                    nombre={nombre}
                    documentos={documentos}
                    puedeEscribir={puedeEscribirDocumentos}
                    onCantidad={alCambiarDocumentos}
                  />
                ) : (
                  <p className="text-sm text-text-soft">No pudimos cargar los documentos. Recarga la página.</p>
                )}
                {puedeEditar && (
                  <Link className="text-sm text-link underline underline-offset-2" href={`/agentes/${agenteId}/editar`}>
                    Ajustes avanzados de búsqueda
                  </Link>
                )}
              </div>
            )}
          </TarjetaDeHabilidad>
        );
      })}
    </ul>
  );
}

function TarjetaDeHabilidad({
  habilidad: h,
  pasos,
  abierta,
  onAbrir,
  onAlternar,
  puedeEditar,
  ocupado,
  children,
}: {
  habilidad: AgentSkill;
  pasos: PasoDeHabilidad[];
  abierta: boolean;
  onAbrir: (abierta: boolean) => void;
  onAlternar: (prender: boolean) => void;
  puedeEditar: boolean;
  ocupado: boolean;
  children: ReactNode;
}) {
  const { nombre, descripcion } = textoDeHabilidad(h.pack_id);
  const estado = ESTADO[estadoDeHabilidad(h)];
  const resumen = resumenDeHabilidad(h, pasos);
  const id = useId();
  const cuerpo = useRef<HTMLDivElement>(null);
  const prevAbierta = useRef(abierta);

  // Al abrirse por prender la habilidad, el foco va al primer control de su configuración.
  useEffect(() => {
    if (abierta && !prevAbierta.current) {
      cuerpo.current?.querySelector<HTMLElement>("button, a[href], select, input")?.focus({ preventScroll: true });
    }
    prevAbierta.current = abierta;
  }, [abierta]);

  return (
    <li className="rounded-lg border border-border-soft bg-surface">
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default"
          aria-expanded={abierta}
          aria-controls={`${id}-cuerpo`}
          disabled={!h.installed}
          onClick={() => onAbrir(!abierta)}
        >
          <ChevronRight
            aria-hidden
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-text-soft transition-transform duration-150 ease-out motion-reduce:transition-none",
              abierta && "rotate-90",
              !h.installed && "opacity-40",
            )}
          />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-medium text-headline">{nombre}</span>
            <span className="text-sm text-text-soft">{abierta || !resumen ? descripcion : resumen}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          {estado.tono === "neutral" ? <Badge>{estado.texto}</Badge> : <Badge variant={estado.tono}>{estado.texto}</Badge>}
          <Switch
            aria-label={`${h.installed ? "Quitar" : "Agregar"} ${nombre}`}
            checked={h.installed}
            disabled={!puedeEditar || ocupado}
            onCheckedChange={onAlternar}
          />
        </div>
      </div>
      <div
        id={`${id}-cuerpo`}
        className={cn(
          "grid transition-[grid-template-rows] duration-150 ease-out motion-reduce:transition-none",
          abierta ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        inert={!abierta}
      >
        <div className="overflow-hidden">
          <div ref={cuerpo} className="flex flex-col gap-4 border-t border-border-soft p-4">
            {abierta && children}
          </div>
        </div>
      </div>
    </li>
  );
}

function Pasos({ pasos, accion }: { pasos: PasoDeHabilidad[]; accion: (p: PasoDeHabilidad) => ReactNode }) {
  return (
    <ol className="flex flex-col gap-2" aria-label="Pasos de la habilidad">
      {pasos.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-2">
            {p.hecho ? (
              <Check aria-hidden className="h-4 w-4 text-status-success-fg" />
            ) : (
              <Circle aria-hidden className="h-4 w-4 text-text-soft" />
            )}
            <span className={p.hecho ? "text-body" : "text-headline"}>
              {p.texto}
              <span className="sr-only">{p.hecho ? " (hecho)" : " (pendiente)"}</span>
            </span>
            {p.sinPublicar && <Badge variant="warning">Sin publicar</Badge>}
          </span>
          {accion(p)}
        </li>
      ))}
    </ol>
  );
}

function CuentaDePagos({
  h,
  cuentas,
  disabled,
  onElegir,
}: {
  h: AgentSkill;
  cuentas: PaymentAccount[];
  disabled: boolean;
  onElegir: (cuentaId: string) => void;
}) {
  const elegida = cuentaElegida(h, cuentas);
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-headline">
        Cuenta Wompi con la que cobra
      </label>
      {cuentas.length === 0 ? (
        <p className="text-sm text-text-soft">
          Todavía no tienes cuentas.{" "}
          <Link className="text-link underline underline-offset-2" href="/conexiones/pagos">
            Agrega una en Conexiones › Pagos
          </Link>
          .
        </p>
      ) : (
        <>
          <Select id={id} value={elegida?.id ?? ""} disabled={disabled} onChange={(e) => e.target.value && onElegir(e.target.value)}>
            <option value="">Elige una cuenta</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {etiquetaDeCuenta(c)}
              </option>
            ))}
          </Select>
          <Link className="text-sm text-link underline underline-offset-2" href="/conexiones/pagos">
            Agregar o editar cuentas
          </Link>
        </>
      )}
    </div>
  );
}
