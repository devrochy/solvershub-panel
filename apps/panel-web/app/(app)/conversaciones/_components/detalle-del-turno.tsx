"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { TurnDetail } from "@/lib/api/types";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";
import {
  estadoDeEnvio,
  huboTraspaso,
  humanizar,
  modoEntreAgentes,
  resultadoDePaso,
  resumenDelTurno,
  textoDeDecision,
  textoDeEvento,
  textoDeVeredicto,
  tipoDeConsumo,
  tituloDePaso,
} from "@/lib/turno";

type Estado = { turnId: string; datos: TurnDetail | null; error: string | null };

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-[0.06em] text-text-soft">{titulo}</h3>
      {children}
    </section>
  );
}

function Json({ valor }: { valor: unknown }) {
  return (
    <pre className="max-h-60 overflow-auto rounded-md border border-border-soft bg-bg-deep p-2 font-mono text-xs text-body">
      {JSON.stringify(valor, null, 2)}
    </pre>
  );
}

/**
 * El depurador de un turno (HU-AOS-28): qué decidió el agente, qué pasos dio y con qué resultado,
 * cómo cambiaron las tareas, qué comprobó el verificador, qué envió y cuánto costó. Las entradas y
 * salidas de las acciones solo con el permiso «Observabilidad» (redactadas por el backend).
 */
export function DetalleDelTurno({ turnId, onClose }: { turnId: string | null; onClose: () => void }) {
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    if (!turnId) return;
    let vigente = true;
    fetch(`/api/turns/${turnId}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as TurnDetail & { error?: string };
        if (!vigente) return;
        setEstado(
          res.ok
            ? { turnId, datos: json, error: null }
            : { turnId, datos: null, error: res.status === 404 ? "Ese turno no existe en este negocio." : (json.error ?? "No se pudo cargar el turno.") },
        );
      })
      .catch(() => vigente && setEstado({ turnId, datos: null, error: "No se pudo contactar el servidor." }));
    return () => {
      vigente = false;
    };
  }, [turnId]);

  const actual = estado && estado.turnId === turnId ? estado : null;
  const t = actual?.datos ?? null;

  return (
    <Sheet open={turnId !== null} onOpenChange={(abierto) => !abierto && onClose()}>
      <SheetContent
        title="Qué pasó en este turno"
        description={t ? resumenDelTurno(t) : undefined}
        className="sm:max-w-2xl"
      >
        {!actual && (
          <div className="flex flex-col gap-3" role="status" aria-busy="true" aria-label="Cargando el turno">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {actual?.error && (
          <p role="alert" className="text-sm text-status-danger-fg">
            {actual.error}
          </p>
        )}
        {t && <Contenido t={t} />}
      </SheetContent>
    </Sheet>
  );
}

function Contenido({ t }: { t: TurnDetail }) {
  return (
    <div className="flex flex-col gap-6 text-sm">
      <Seccion titulo="Decisión">
        <p className="text-body">
          {textoDeDecision(t.decision.outcome)}
          {t.decision.blocked_by ? ` (${humanizar(t.decision.blocked_by)})` : ""} · {formatDateTime(t.at)}
        </p>
        {huboTraspaso(t) && (
          <p className="text-body">
            Pasó de <strong>{t.decision.active_agent?.name}</strong> a <strong>{t.decision.final_agent?.name}</strong>.
          </p>
        )}
        {t.decision.candidates.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Trámites candidatos">
            {t.decision.candidates.map((c, i) => (
              <li key={`${c.procedure_id}-${i}`}>
                <Badge variant="neutral">
                  {humanizar(c.procedure_id)}
                  {c.score != null ? ` · ${Math.round(c.score * 100)} %` : ""}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Pasos">
        {t.steps.length === 0 ? (
          <p className="text-text-soft">El agente no usó herramientas ni comandos en este turno.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {t.steps.map((p, i) => {
              const r = resultadoDePaso(p);
              return (
                <li key={i} className="flex flex-col gap-1 rounded-md border border-border-soft p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-headline">{tituloDePaso(p)}</span>
                    {r && <Badge variant={r.tono}>{r.texto}</Badge>}
                  </div>
                  {p.detail_hidden && (
                    <p className="flex items-center gap-1 text-xs text-text-soft">
                      <EyeOff aria-hidden className="h-3 w-3" />
                      Los datos de esta acción requieren el permiso «Observabilidad».
                    </p>
                  )}
                  {t.can_see_detail && (p.input != null || p.output != null) && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-link">Ver entrada y salida (datos personales enmascarados)</summary>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-text-soft">Entrada</p>
                          <Json valor={p.input} />
                        </div>
                        <div>
                          <p className="mb-1 text-text-soft">Salida</p>
                          <Json valor={p.output} />
                        </div>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Seccion>

      {t.task_events.length > 0 && (
        <Seccion titulo="Cambios en las tareas">
          <ul className="flex flex-col gap-1">
            {t.task_events.map((e) => (
              <li key={`${e.task_id}-${e.seq}`} className="text-body">
                <span className="text-text-soft">{humanizar(e.procedure_id)} · </span>
                {textoDeEvento(e)}
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Comprobaciones">
        {t.verifier.length === 0 ? (
          <p className="text-text-soft">El verificador no revisó nada en este turno.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {t.verifier.map((v) => (
              <li key={v.kind} className="flex flex-wrap items-center gap-2">
                <span className="text-body">{humanizar(v.kind)}</span>
                <Badge variant={v.verdict === "fail" ? "danger" : v.verdict === "pass" ? "success" : "neutral"}>
                  {textoDeVeredicto(v.verdict)}
                </Badge>
              </li>
            ))}
            {t.verifier_retries > 0 && (
              <li className="text-text-soft">Reescribió la respuesta {t.verifier_retries} {t.verifier_retries === 1 ? "vez" : "veces"}.</li>
            )}
          </ul>
        )}
      </Seccion>

      {t.a2a.length > 0 && (
        <Seccion titulo="Entre agentes">
          <ul className="flex flex-col gap-1">
            {t.a2a.map((o) => (
              <li key={o.id} className="text-body">
                {modoEntreAgentes(o.mode)} · {humanizar(o.status)} · {o.calls} {o.calls === 1 ? "llamado" : "llamados"}
                {o.spent_usd != null ? ` · ${formatUsd(o.spent_usd)}` : ""}
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Envío">
        {t.delivery.length === 0 ? (
          <p className="text-text-soft">No envió mensajes en este turno.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {t.delivery.map((m) => (
              <li key={m.id} className="rounded-md bg-surface-2 px-3 py-2">
                <p className="text-headline">{m.text || <span className="italic text-text-soft">(sin texto)</span>}</p>
                <p className="mt-1 text-xs text-text-soft">
                  {estadoDeEnvio(m.status)}
                  {m.template_name ? ` · plantilla ${m.template_name}` : ""}
                  {m.error_reason ? ` · ${m.error_reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {t.cost.length > 0 && (
        <Seccion titulo="Consumo">
          <ul className="flex flex-col gap-1">
            {t.cost.map((c) => (
              <li key={`${c.kind}-${c.model}`} className="flex flex-wrap justify-between gap-2 tabular-nums text-body">
                <span>
                  {tipoDeConsumo(c.kind)} · {c.model}
                </span>
                <span>
                  {formatNumber(c.input_tokens + c.output_tokens)} tokens
                  {t.can_see_costs && c.cost_usd != null ? ` · ${formatUsd(c.cost_usd)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}
    </div>
  );
}
