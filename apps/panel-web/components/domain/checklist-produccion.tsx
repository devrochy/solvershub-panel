"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

import { MarcaDeRevision } from "@/components/domain/marca-de-revision";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { ReadinessItem } from "@/lib/api/types";
import {
  ESPERA_MAXIMA_MS,
  INTERVALO_MS,
  enCurso,
  enlaceReparacion,
  estadoItem,
  resumenCorrida,
  type EstadoCorrida,
} from "@/lib/checklist-produccion";
import { formatDateTime } from "@/lib/format";
import { comoArreglar } from "@/lib/plataforma";

export type Corrida = {
  status: EstadoCorrida;
  ready?: boolean | null;
  items?: ReadinessItem[];
  error?: string | null;
  requested_at?: string | null;
  finished_at?: string | null;
};

/**
 * Checklist de producción (HU-CONN-07): muestra la última corrida guardada y deja pedir otra.
 * La revisión corre en el worker; aquí solo se encola (`POST`) y se consulta (`GET`) hasta que
 * termina. Sirve para una conexión (`connectionId`, con enlaces de reparación) y para la app de
 * Meta de la plataforma.
 */
export function ChecklistProduccion({
  endpoint,
  initial,
  connectionId,
  plataforma = false,
}: {
  endpoint: string;
  initial: Corrida;
  connectionId?: string;
  plataforma?: boolean;
}) {
  const [corrida, setCorrida] = useState<Corrida>(initial);
  const [error, setError] = useState<string>();
  const [pidiendo, setPidiendo] = useState(false);
  // Momento en que se pidió la revisión: corta la consulta si tarda demasiado.
  const desde = useRef<number>(0);

  const consultar = useCallback(async () => {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return;
    setCorrida((await res.json()) as Corrida);
  }, [endpoint]);

  const corriendo = enCurso(corrida.status);
  useEffect(() => {
    if (!corriendo) return;
    if (desde.current === 0) desde.current = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - desde.current > ESPERA_MAXIMA_MS) {
        clearInterval(timer);
        setError("La revisión está tardando. Vuelve en unos minutos para ver el resultado.");
        return;
      }
      void consultar();
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [corriendo, consultar]);

  async function revisar() {
    setPidiendo(true);
    setError(undefined);
    desde.current = Date.now();
    const res = await fetch(endpoint, { method: "POST" });
    setPidiendo(false);
    const json = (await res.json().catch(() => ({}))) as Corrida & { error?: string };
    if (!res.ok) {
      setError(json.error ?? "No se pudo pedir la revisión.");
      return;
    }
    setCorrida(json);
  }

  const resumen = resumenCorrida(corrida);
  const items = corrida.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={resumen.variant}>{resumen.label}</Badge>
        <span className="text-xs text-text-soft">
          {corrida.finished_at
            ? `Última revisión: ${formatDateTime(corrida.finished_at)}`
            : corrida.requested_at
              ? `Pedida: ${formatDateTime(corrida.requested_at)}`
              : "Todavía no se ha revisado."}
        </span>
        <Button className="ml-auto" disabled={pidiendo || corriendo} onClick={() => void revisar()} variant="outline">
          <Activity className="h-4 w-4" aria-hidden />
          {corriendo ? "Revisando…" : "Revisar ahora"}
        </Button>
      </div>

      {corrida.status === "failed" && corrida.error && (
        <FormFeedback error={corrida.error} />
      )}
      <FormFeedback error={error} />

      {items.length > 0 && <ItemsChecklist items={items} connectionId={connectionId} plataforma={plataforma} />}
    </div>
  );
}

/**
 * Ítems de un checklist de producción (HU-CONN-07) con su estado y, si se pasa `connectionId`,
 * el enlace para reparar los que no están en verde. Lo usan "Producción" de la conexión, la App
 * de Meta y el paso "Verificar" de "Pasar a producción".
 */
export function ItemsChecklist({
  items,
  connectionId,
  plataforma = false,
}: {
  items: ReadinessItem[];
  connectionId?: string;
  /** La App de Meta (PLT-07): lo que falla primero, con cómo arreglarlo, y lo que está en orden plegado. */
  plataforma?: boolean;
}) {
  if (plataforma) return <ChecklistDePlataforma items={items} />;
  return (
    <Card>
      <CardContent className="pt-2">
        <ul className="flex flex-col">
          {items.map((item) => {
            const estado = estadoItem(item.ok);
            const arreglo =
              connectionId && item.ok !== true ? enlaceReparacion(item.repair_action, connectionId) : null;
            return (
              <li key={item.key} className="flex flex-wrap items-center gap-3 border-t border-border-soft py-3 text-sm first:border-t-0">
                <MarcaDeRevision ok={item.ok} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-headline">{item.label}</span>
                  <span className="text-xs text-text-soft">{item.ok !== true && item.detail ? `${estado.label} · ${item.detail}` : estado.label}</span>
                </span>
                {arreglo && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={arreglo.href}>{arreglo.label}</Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function ChecklistDePlataforma({ items }: { items: ReadinessItem[] }) {
  const pendientes = items.filter((i) => i.ok !== true);
  const enOrden = items.filter((i) => i.ok === true);
  return (
    <div className="flex flex-col gap-3">
      {pendientes.map((item) => {
        const arreglo = item.ok === false ? comoArreglar(item.key) : null;
        return (
          <Card key={item.key}>
            <CardContent className="flex items-start gap-3 pt-5 text-sm">
              <MarcaDeRevision ok={item.ok} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium text-headline">{item.label}</span>
                {item.detail && <span className="text-body">{item.detail}</span>}
                {arreglo ? (
                  <span className="text-body">
                    <span className="font-medium text-headline">Cómo arreglarlo: </span>
                    {arreglo}
                  </span>
                ) : (
                  item.ok !== false && <span className="text-xs text-text-soft">No se pudo comprobar. Vuelve a revisar en unos minutos.</span>
                )}
              </span>
            </CardContent>
          </Card>
        );
      })}
      {enOrden.length > 0 && (
        <details className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-headline">
            {enOrden.length === 1 ? "1 en orden" : `${enOrden.length} en orden`}
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-body">
            {enOrden.map((i) => (
              <li key={i.key} className="flex items-center gap-2">
                <MarcaDeRevision ok />
                {i.label}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
