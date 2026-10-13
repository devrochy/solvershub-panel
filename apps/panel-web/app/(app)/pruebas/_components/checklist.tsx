"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { QaConfig, QaItem } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { ESTADO_CONFIG, porcentaje, type EstadoConfig } from "@/lib/qa/estados";
import { toast } from "@/lib/toast-store";

import { llamarQa } from "./api";

type Fila = QaItem & { estado: string; nota?: string | null; actualizado_en?: string | null };

function badge(estado: string) {
  const { label, tono } = ESTADO_CONFIG[estado as EstadoConfig] ?? ESTADO_CONFIG.pendiente;
  return tono === "neutral" ? <Badge>{label}</Badge> : <Badge variant={tono}>{label}</Badge>;
}

function Punto({ inicial, editable }: { inicial: Fila; editable: boolean }) {
  const [fila, setFila] = useState(inicial);
  const [nota, setNota] = useState(inicial.nota ?? "");

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

  return (
    <li className="flex flex-col gap-3 border-t border-border-soft py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-medium text-headline">{fila.titulo}</span>
          {fila.resumen && <span className="text-xs text-text-soft">{fila.resumen}</span>}
        </div>
        {editable ? (
          <Select
            aria-label={`Estado de ${fila.titulo}`}
            className="w-36"
            value={fila.estado}
            onChange={(e) => void guardar({ estado: e.target.value })}
          >
            {(Object.keys(ESTADO_CONFIG) as EstadoConfig[]).map((k) => (
              <option key={k} value={k}>
                {ESTADO_CONFIG[k].label}
              </option>
            ))}
          </Select>
        ) : (
          badge(fila.estado)
        )}
      </div>
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        {fila.porque && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-headline">Por qué</dt>
            <dd className="text-body">{fila.porque}</dd>
          </div>
        )}
        {fila.como && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-headline">Cómo</dt>
            <dd className="text-body">{fila.como}</dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-soft">
        {(fila.vars ?? []).map((v) => (
          <code key={v} className="rounded-sm bg-hover px-1.5 py-0.5 font-mono text-[12px] text-headline">
            {v}
          </code>
        ))}
        {fila.quien && <span>Lo hace: {fila.quien}</span>}
        {fila.actualizado_en && <span>Actualizado {formatDateTime(fila.actualizado_en)}</span>}
      </div>
      {editable ? (
        <Textarea
          aria-label={`Nota de ${fila.titulo}`}
          rows={2}
          className="min-h-14"
          placeholder="Nota: qué se hizo, qué falta, dónde quedó"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => {
            if (nota.trim() !== (fila.nota ?? "")) void guardar({ nota: nota.trim() || null });
          }}
        />
      ) : (
        fila.nota && <p className="text-sm text-body">Nota: {fila.nota}</p>
      )}
    </li>
  );
}

/**
 * Checklist de configuración (HU-QA-03): lo que falta en test o lo que hay que validar antes
 * de producción, con por qué, cómo y las variables. No se reinicia con cada ciclo.
 */
export function Checklist({ items, editable, aviso }: { items: Fila[]; editable: boolean; aviso?: string }) {
  const listos = items.filter((i) => i.estado === "listo" || i.estado === "no_aplica").length;
  const grupos = new Map<string, Fila[]>();
  for (const item of items) {
    const g = grupos.get(item.grupo) ?? [];
    g.push(item);
    grupos.set(item.grupo, g);
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sh-label text-headline">Listos o que no aplican</span>
          <span className="text-sm tabular-nums text-body">
            {listos} de {items.length} · {porcentaje(listos, items.length)} %
          </span>
        </div>
        <Progress label="Avance del checklist" value={listos} max={items.length || 1} />
        {aviso && <p className="text-xs text-text-soft">{aviso}</p>}
      </div>
      {[...grupos.entries()].map(([grupo, filas]) => (
        <Card key={grupo}>
          <CardContent className="flex flex-col gap-3 pt-5">
            <h2 className="font-display text-sh-block text-headline">{grupo}</h2>
            <ul className="flex flex-col">
              {filas.map((f) => (
                <Punto key={f.slug} inicial={f} editable={editable} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
