"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

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
}: {
  endpoint: string;
  initial: Corrida;
  connectionId?: string;
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
        <Button
          className="ml-auto"
          disabled={pidiendo || corriendo}
          onClick={() => void revisar()}
          size="sm"
          variant="accent"
        >
          <Activity className="h-4 w-4" aria-hidden />
          {corriendo ? "Revisando…" : "Revisar ahora"}
        </Button>
      </div>

      {corrida.status === "failed" && corrida.error && (
        <p role="alert" className="text-sm text-status-danger-fg">
          {corrida.error}
        </p>
      )}
      <FormFeedback error={error} />

      {items.length > 0 && <ItemsChecklist items={items} connectionId={connectionId} />}
    </div>
  );
}

/**
 * Ítems de un checklist de producción (HU-CONN-07) con su estado y, si se pasa `connectionId`,
 * el enlace para reparar los que no están en verde. Lo usan "Producción" de la conexión, la App
 * de Meta y el paso "Verificar" de "Pasar a producción".
 */
export function ItemsChecklist({ items, connectionId }: { items: ReadinessItem[]; connectionId?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <ul className="flex flex-col divide-y divide-border-soft">
          {items.map((item) => {
            const estado = estadoItem(item.ok);
            const arreglo =
              connectionId && item.ok !== true ? enlaceReparacion(item.repair_action, connectionId) : null;
            return (
              <li key={item.key} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span className="flex flex-col gap-0.5">
                  <span className="text-headline">{item.label}</span>
                  {item.detail && <span className="text-xs text-text-soft">{item.detail}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {arreglo && (
                    <Link className="text-xs text-link underline" href={arreglo.href}>
                      {arreglo.label}
                    </Link>
                  )}
                  <Badge variant={estado.variant}>{estado.label}</Badge>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
