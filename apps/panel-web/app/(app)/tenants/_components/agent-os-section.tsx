"use client";

import { useEffect, useState } from "react";

import { ReferenciasRetiradas } from "@/app/(app)/tenants/_components/referencias-retiradas";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { AgentOSEstado, AgentOSResultado } from "@/lib/api/types";
import {
  ETIQUETA_RUTEO,
  NOTA_RUNBOOK,
  RUTEO_CORTO,
  RUTEOS,
  iguales,
  resumenDelCambio,
  type Banderas,
  type Ruteo,
} from "@/lib/agent-os";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/use-action";

type Reporte = Pick<AgentOSResultado, "accion" | "pasos" | "bloqueos" | "avisos">;

const ACCION: Record<string, string> = {
  sin_cambios: "Sin cambios: el negocio ya está así.",
  listo: "Listo para aplicar.",
  bloqueado: "Bloqueado: el negocio no está listo para este cambio.",
  aplicado: "Cambio aplicado.",
};

function banderas(e: Pick<AgentOSEstado, "procedures" | "routing">): Banderas {
  return { procedures: e.procedures, routing: e.routing };
}

type Lectura = { estado: AgentOSEstado } | { error: string };

async function leer(url: string): Promise<Lectura> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as AgentOSEstado & { error?: string };
  return res.ok ? { estado: json } : { error: "No pudimos leer cómo atiende el asistente de este negocio." };
}

/** El asistente del negocio (HU-AOS-15, PLT-03): reparto y recorridos, en palabras; simular y aplicar (master). */
export function AgentOSSection({ tenantId }: { tenantId: string }) {
  const url = `/api/platform/tenants/${tenantId}/agent-os`;
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [estado, setEstado] = useState<AgentOSEstado | null>(null);
  const [cargaFallida, setCargaFallida] = useState<string | null>(null);
  const [objetivo, setObjetivo] = useState<Banderas | null>(null);
  const [reporte, setReporte] = useState<Reporte | null>(null);

  function mostrar(lectura: Lectura) {
    if ("error" in lectura) {
      setCargaFallida(lectura.error);
      return;
    }
    setCargaFallida(null);
    setEstado(lectura.estado);
    setObjetivo(banderas(lectura.estado));
  }

  async function cargar() {
    mostrar(await leer(url));
  }

  useEffect(() => {
    let vigente = true;
    void leer(url).then((lectura) => {
      if (vigente) mostrar(lectura);
    });
    return () => {
      vigente = false;
    };
  }, [url]);

  if (cargaFallida) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-sm text-body">
        {cargaFallida}
        <Button type="button" variant="outline" size="sm" onClick={() => void cargar()}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (!estado || !objetivo) return <Skeleton className="h-24 w-full" />;

  const actual = banderas(estado);
  const cambia = !iguales(actual, objetivo);
  const cambiar = (parcial: Partial<Banderas>) => {
    setObjetivo({ ...objetivo, ...parcial });
    setReporte(null);
  };

  async function enviar(metodo: "POST" | "PUT") {
    const res = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(objetivo),
    });
    const json = (await res.json().catch(() => ({}))) as Partial<AgentOSResultado> & {
      error?: string;
      details?: Reporte;
    };
    const cuerpo = res.ok ? json : json.details;
    if (cuerpo?.accion) {
      setReporte({ accion: cuerpo.accion, pasos: cuerpo.pasos ?? [], bloqueos: cuerpo.bloqueos ?? [], avisos: cuerpo.avisos ?? [] });
    }
    return { res, json };
  }

  async function simular() {
    await run(async () => {
      const { res, json } = await enviar("POST");
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo simular." };
      return { ok: true, success: "Simulación lista: revisa bloqueos y avisos." };
    });
  }

  async function aplicar() {
    if (!objetivo) return;
    const ok = await confirm({
      title: "¿Aplicar el cambio del Agent OS?",
      description: `${resumenDelCambio(actual, objetivo)} ${NOTA_RUNBOOK}`,
      confirmLabel: "Aplicar",
    });
    if (!ok) return;
    await run(async () => {
      const { res, json } = await enviar("PUT");
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo aplicar." };
      await cargar();
      return { ok: true, success: "Agent OS actualizado." };
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`aos-${tenantId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`aos-${tenantId}`} className="text-sm font-medium text-headline">
          Cómo atiende
        </p>
        <span className="text-xs text-text-soft">
          Reparte: {RUTEO_CORTO[actual.routing]} · recorridos guiados:{" "}
          {actual.procedures ? "sí" : "no"}
        </span>
      </div>
      {estado.ultimo_cambio && (
        <p className="text-xs text-body">
          Último cambio: {estado.ultimo_cambio.actor}, el {formatDate(estado.ultimo_cambio.fecha)}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Reparte entre especialistas" htmlFor={`aos-ru-${tenantId}`}>
          <Select
            id={`aos-ru-${tenantId}`}
            value={objetivo.routing}
            onChange={(e) => cambiar({ routing: e.target.value as Ruteo })}
            disabled={pending}
          >
            {RUTEOS.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_RUTEO[r]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`aos-pr-${tenantId}`} className="flex flex-col text-sm text-body">
          Recorridos guiados
          <span className="text-xs text-text-soft">Pedidos, citas y cobros paso a paso.</span>
        </label>
        <Switch
          id={`aos-pr-${tenantId}`}
          aria-label="Recorridos guiados"
          checked={objetivo.procedures}
          onCheckedChange={(procedures) => cambiar({ procedures })}
          disabled={pending}
        />
      </div>
      <details className="text-xs text-body">
        <summary className="cursor-pointer text-link">Antes de encender</summary>
        <p className="mt-1">{NOTA_RUNBOOK}</p>
      </details>

      {reporte && (
        <div className="flex flex-col gap-2 rounded-md border border-border-soft p-3 text-sm" role="status">
          <p className={reporte.accion === "bloqueado" ? "text-status-danger-fg" : "text-headline"}>
            {ACCION[reporte.accion] ?? reporte.accion}
          </p>
          {reporte.bloqueos.length > 0 && (
            <ul className="list-disc pl-5 text-status-danger-fg">
              {reporte.bloqueos.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {reporte.avisos.length > 0 && (
            <ul className="list-disc pl-5 text-status-warning-fg">
              {reporte.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          {reporte.pasos.length > 0 && (
            <ol className="list-decimal pl-5 text-body">
              {reporte.pasos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void simular()} disabled={pending || !cambia}>
          Simular
        </Button>
        <Button type="button" size="sm" onClick={() => void aplicar()} disabled={pending || !cambia}>
          Aplicar
        </Button>
      </div>

      <ReferenciasRetiradas tenantId={tenantId} />
    </section>
  );
}
