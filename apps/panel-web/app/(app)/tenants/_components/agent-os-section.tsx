"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AgentOSEstado, AgentOSResultado } from "@/lib/api/types";
import {
  ETIQUETA_RUNTIME,
  ETIQUETA_RUTEO,
  NOTA_RUNBOOK,
  RUNTIMES,
  RUTEOS,
  iguales,
  normalizar,
  resumenDelCambio,
  type Banderas,
  type Ruteo,
  type Runtime,
} from "@/lib/agent-os";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/use-action";

type Reporte = Pick<AgentOSResultado, "accion" | "pasos" | "bloqueos" | "avisos">;

const ACCION: Record<string, string> = {
  sin_cambios: "Sin cambios: el negocio ya está así.",
  listo: "Listo para aplicar.",
  por_preparar: "Al aplicar se corren los pasos de abajo y después las comprobaciones de migrar-a-v3.",
  bloqueado: "Bloqueado: el negocio no está listo para este cambio.",
  aplicado: "Cambio aplicado.",
};

function banderas(e: Pick<AgentOSEstado, "runtime" | "procedures" | "routing">): Banderas {
  return { runtime: e.runtime, procedures: e.procedures, routing: e.routing };
}

type Lectura = { estado: AgentOSEstado } | { error: string };

async function leer(url: string): Promise<Lectura> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as AgentOSEstado & { error?: string };
  return res.ok ? { estado: json } : { error: json.error ?? "No se pudo leer el Agent OS del negocio." };
}

/** Agent OS del negocio (HU-AOS-15): estado, simular y aplicar (master). */
export function AgentOSSection({ tenantId }: { tenantId: string }) {
  const url = `/api/platform/tenants/${tenantId}/agent-os`;
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [estado, setEstado] = useState<AgentOSEstado | null>(null);
  const [cargaFallida, setCargaFallida] = useState<string | null>(null);
  const [objetivo, setObjetivo] = useState<Banderas | null>(null);
  const [construir, setConstruir] = useState(false);
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

  if (cargaFallida) return <p className="text-sm text-status-danger-fg">{cargaFallida}</p>;
  if (!estado || !objetivo) return <p className="text-sm text-body">Cargando el Agent OS…</p>;

  const actual = banderas(estado);
  const cambia = !iguales(actual, objetivo);
  const cambiar = (parcial: Partial<Banderas>) => {
    setObjetivo(normalizar({ ...objetivo, ...parcial }));
    setReporte(null);
  };

  async function enviar(metodo: "POST" | "PUT") {
    const res = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...objetivo, construir }),
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
      destructive: objetivo.runtime === "legacy" && actual.runtime === "v3",
    });
    if (!ok) return;
    await run(async () => {
      const { res, json } = await enviar("PUT");
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo aplicar." };
      await cargar();
      return { ok: true, success: "Agent OS actualizado." };
    });
  }

  const v3 = objetivo.runtime === "v3";
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`aos-${tenantId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`aos-${tenantId}`} className="text-sm font-medium text-headline">
          Agent OS
        </p>
        <span className="flex flex-wrap gap-1.5">
          <Badge variant={actual.runtime === "v3" ? "accent" : "neutral"}>{actual.runtime}</Badge>
          <Badge variant={actual.procedures ? "accent" : "neutral"}>
            procedimientos {actual.procedures ? "on" : "off"}
          </Badge>
          <Badge variant={actual.routing === "off" ? "neutral" : "accent"}>ruteo {actual.routing}</Badge>
        </span>
      </div>
      {!estado.aos_connection_routing && (
        <p className="text-sm text-status-warning-fg">
          AOS_CONNECTION_ROUTING está apagada en este entorno: v3 no se puede encender (se cambia con un despliegue).
        </p>
      )}
      {estado.ultimo_cambio && (
        <p className="text-xs text-body">
          Último cambio: {estado.ultimo_cambio.actor} · {formatDate(estado.ultimo_cambio.fecha)}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Runtime" htmlFor={`aos-rt-${tenantId}`}>
          <Select
            id={`aos-rt-${tenantId}`}
            value={objetivo.runtime}
            onChange={(e) => cambiar({ runtime: e.target.value as Runtime })}
            disabled={pending}
          >
            {RUNTIMES.map((r) => (
              <option key={r} value={r}>
                {ETIQUETA_RUNTIME[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Enrutamiento" htmlFor={`aos-ru-${tenantId}`} help={v3 ? undefined : "Exige v3."}>
          <Select
            id={`aos-ru-${tenantId}`}
            value={objetivo.routing}
            onChange={(e) => cambiar({ routing: e.target.value as Ruteo })}
            disabled={pending || !v3}
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
        <label htmlFor={`aos-pr-${tenantId}`} className="text-sm text-body">
          Procedimientos {v3 ? "" : "(exige v3)"}
        </label>
        <Switch
          id={`aos-pr-${tenantId}`}
          aria-label="Procedimientos"
          checked={objetivo.procedures}
          onCheckedChange={(procedures) => cambiar({ procedures })}
          disabled={pending || !v3}
        />
      </div>
      {v3 && actual.runtime === "legacy" && (
        <Checkbox
          id={`aos-co-${tenantId}`}
          label="Si la release activa está desactualizada, construir y promover una nueva (cambia la release activa)."
          checked={construir}
          onCheckedChange={setConstruir}
          disabled={pending}
        />
      )}
      <p className="text-xs text-body">{NOTA_RUNBOOK}</p>

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
    </section>
  );
}
