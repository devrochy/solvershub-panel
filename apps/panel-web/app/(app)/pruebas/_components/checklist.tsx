"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { QaConfig, QaItem } from "@/lib/api/types";
import { ESTADO_CONFIG, fechaEnPalabras, porcentaje, type EstadoConfig } from "@/lib/qa/estados";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

import { llamarQa } from "./api";

type Fila = QaItem & { estado: string; nota?: string | null; actualizado_en?: string | null };

function EstadoDelPunto({ estado }: { estado: string }) {
  const { label, tono } = ESTADO_CONFIG[estado as EstadoConfig] ?? ESTADO_CONFIG.pendiente;
  return tono === "neutral" ? <Badge>{label}</Badge> : <Badge variant={tono}>{label}</Badge>;
}

function Punto({ inicial, editable }: { inicial: Fila; editable: boolean }) {
  const [fila, setFila] = useState(inicial);
  const [abierto, setAbierto] = useState(false);
  const [editandoNota, setEditandoNota] = useState(false);
  const [nota, setNota] = useState(inicial.nota ?? "");
  const detalleId = `punto-${fila.slug}`;

  async function guardar(cambios: { estado?: string; nota?: string | null }) {
    const anterior = fila;
    setFila({ ...fila, ...cambios });
    const r = await llamarQa<QaConfig>(`config/${fila.slug}`, { method: "PUT", json: cambios });
    if (!r.ok) {
      setFila(anterior);
      toast.error(r.error);
      return;
    }
    setFila((f) => ({ ...f, estado: r.data.estado, nota: r.data.nota, actualizado_en: r.data.actualizado_en }));
  }

  const resumen = [fila.grupo, fila.nota || fila.quien || null].filter(Boolean).join(" · ");
  return (
    <li className="border-t border-border-soft first:border-t-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={detalleId}
          onClick={() => setAbierto((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ChevronDown aria-hidden className={cn("h-4 w-4 shrink-0 text-text-soft transition-transform duration-150", !abierto && "-rotate-90")} />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium text-headline">{fila.titulo}</span>
            {resumen && <span className="text-xs text-text-soft">{resumen}</span>}
          </span>
        </button>
        {editable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label={`Estado de ${fila.titulo}: ${ESTADO_CONFIG[fila.estado as EstadoConfig]?.label ?? "Pendiente"}`}>
                {ESTADO_CONFIG[fila.estado as EstadoConfig]?.label ?? "Pendiente"}
                <ChevronDown aria-hidden className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(ESTADO_CONFIG) as EstadoConfig[]).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => void guardar({ estado: k })}>
                  {ESTADO_CONFIG[k].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <EstadoDelPunto estado={fila.estado} />
        )}
      </div>
      {abierto && (
        <div id={detalleId} className="flex flex-col gap-3 px-4 pb-4 pl-10 text-sm">
          {(fila.porque || fila.como) && (
            <dl className="grid gap-3 md:grid-cols-2">
              {fila.porque && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-text-soft">Por qué</dt>
                  <dd className="text-body">{fila.porque}</dd>
                </div>
              )}
              {fila.como && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-text-soft">Cómo</dt>
                  <dd className="text-body">{fila.como}</dd>
                </div>
              )}
            </dl>
          )}
          {((fila.vars ?? []).length > 0 || fila.quien || fila.actualizado_en) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-soft">
              {(fila.vars ?? []).map((v) => (
                <code key={v} className="rounded-sm bg-hover px-1.5 py-0.5 font-mono text-sh-caption text-headline">
                  {v}
                </code>
              ))}
              {fila.quien && <span>Lo hace: {fila.quien}</span>}
              {fila.actualizado_en && <span>Actualizado el {fechaEnPalabras(fila.actualizado_en)}</span>}
            </div>
          )}
          {editable && editandoNota ? (
            <Textarea
              aria-label={`Nota de ${fila.titulo}`}
              rows={2}
              className="min-h-14"
              autoFocus
              placeholder="Qué se hizo, qué falta, dónde quedó"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={() => {
                setEditandoNota(false);
                if (nota.trim() !== (fila.nota ?? "")) void guardar({ nota: nota.trim() || null });
              }}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {fila.nota && <p className="text-body">Nota: {fila.nota}</p>}
              {editable && (
                <Button size="sm" variant="ghost" onClick={() => setEditandoNota(true)}>
                  {fila.nota ? "Editar nota" : "Agregar nota"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Lista de verificación de un entorno (HU-QA-03, PRU-09): lo que falta en test o lo que hay que
 * validar antes de producción. Cada punto es una fila con su estado; «Por qué», «Cómo», las
 * variables y la nota se ven al abrirla. No se reinicia con cada ciclo.
 */
export function Checklist({ items, editable, aviso }: { items: Fila[]; editable: boolean; aviso?: string }) {
  const listos = items.filter((i) => i.estado === "listo" || i.estado === "no_aplica").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-body">
            <span className="font-medium text-headline">
              {listos} de {items.length}
            </span>{" "}
            listos o que no aplican
          </span>
          <span className="text-sm tabular-nums text-text-soft">{porcentaje(listos, items.length)} %</span>
        </div>
        <Progress label="Avance de la lista" value={listos} max={items.length || 1} />
        {aviso && <p className="text-xs text-text-soft">{aviso}</p>}
      </div>
      <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
        {items.map((f) => (
          <Punto key={f.slug} inicial={f} editable={editable} />
        ))}
      </ul>
    </div>
  );
}
