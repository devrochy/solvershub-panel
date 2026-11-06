"use client";

import { useState } from "react";
import { AlertTriangle, FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { InputNumero } from "@/components/ui/input-numero";
import { Progress } from "@/components/ui/progress";
import type { CanaryState } from "@/lib/api/types";
import {
  advertenciasDePrueba,
  estadoDePrueba,
  filasDeComparacion,
  motivoNoPublicar,
  muestraDePrueba,
  PORCENTAJE_MAX,
  PORCENTAJE_MIN,
  PORCENTAJE_SUGERIDO,
  textoPorcentaje,
  textoSenalDura,
} from "@/lib/canary";
import { formatDateTime } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import { mensajeDeError } from "@/lib/versiones";

type Respuesta = { error?: string; code?: string };

async function enviar(url: string, method: "POST" | "PATCH", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Respuesta };
}

const TONO_BADGE = { info: "info", success: "success", danger: "danger" } as const;

/**
 * La prueba en curso (HU-AOS-32): qué versión y a qué parte de los clientes, cuánto lleva la
 * muestra, la comparación con la versión actual y las acciones «Publicar para todos» y «Detener».
 */
export function PruebaConUnaParte({
  conexionId,
  prueba,
  puedeOperar,
}: {
  conexionId: string;
  prueba: CanaryState;
  puedeOperar: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [cambiando, setCambiando] = useState(false);
  const estado = estadoDePrueba(prueba);
  const muestra = muestraDePrueba(prueba);
  const filas = filasDeComparacion(prueba);
  const advertencias = advertenciasDePrueba(prueba);
  const noPublicar = motivoNoPublicar(prueba);
  const senal = textoSenalDura(prueba);
  const numero = prueba.release_number;
  const base = `/api/connections/${conexionId}/canary`;

  const publicar = async () => {
    const ok = await confirm({
      title: `¿Publicar la versión ${numero} para todos?`,
      description:
        `Las conversaciones nuevas usarán la versión ${numero}. Las que están en curso siguen con la versión ` +
        "que tenían hasta que terminen. Si algo sale mal, puedes volver a la anterior con un clic.",
      confirmLabel: `Publicar la versión ${numero}`,
      destructive: false,
    });
    if (!ok) return;
    await run(async () => {
      const r = await enviar(`${base}/publicar`, "POST");
      return r.ok
        ? { ok: true, success: `La versión ${numero} quedó publicada para todos.` }
        : { ok: false, status: r.status, error: mensajeDeError(r.json.code, r.json.error) };
    });
  };

  const detener = async () => {
    const ok = await confirm({
      title: "¿Detener la prueba?",
      description:
        `Las conversaciones que atendía la versión ${numero} pasan a la actual desde su próximo mensaje. ` +
        "La versión no se borra: puedes volver a probarla cuando quieras.",
      confirmLabel: "Detener la prueba",
    });
    if (!ok) return;
    await run(async () => {
      const r = await enviar(`${base}/detener`, "POST");
      return r.ok
        ? { ok: true, success: "La prueba quedó detenida." }
        : { ok: false, status: r.status, error: mensajeDeError(r.json.code, r.json.error) };
    });
  };

  return (
    <section
      aria-labelledby="prueba-titulo"
      className="flex flex-col gap-4 rounded-lg border border-status-info-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="prueba-titulo" className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-headline">
          <FlaskConical aria-hidden className="h-4 w-4 text-status-info-fg" />
          Versión {numero} en prueba con el {prueba.percent} % de los clientes
          <Badge variant={TONO_BADGE[estado.tono]}>{estado.titulo}</Badge>
        </h2>
        <span className="text-xs text-soft">Desde {formatDateTime(prueba.started_at)}</span>
      </div>

      <p className="text-sm text-body">{estado.detalle}</p>

      <div className="flex flex-col gap-1.5">
        <Progress
          label="Muestra de la prueba"
          value={Math.min(muestra.conversaciones, muestra.umbralConversaciones)}
          max={muestra.umbralConversaciones}
          valueText={muestra.texto}
          size="sm"
        />
        <p className="text-xs text-soft">
          {muestra.texto}
          {prueba.base_release_number != null && ` · se compara con la versión ${prueba.base_release_number}`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <caption className="sr-only">Comparación entre la versión actual y la versión en prueba</caption>
          <thead>
            <tr className="border-b border-border-soft text-left text-xs uppercase tracking-[0.06em] text-soft">
              <th scope="col" className="py-2 pr-3 font-medium">Métrica</th>
              <th scope="col" className="py-2 pr-3 font-medium">Actual</th>
              <th scope="col" className="py-2 pr-3 font-medium">En prueba</th>
              <th scope="col" className="py-2 font-medium">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.metrica} className="border-b border-border-soft last:border-0">
                <th scope="row" className="py-2 pr-2 text-left font-normal text-body sm:pr-3">{f.metrica}</th>
                <td className="whitespace-nowrap py-2 pr-2 tabular-nums text-body sm:pr-3">{f.actual}</td>
                <td className="whitespace-nowrap py-2 pr-2 tabular-nums text-body sm:pr-3">{f.nueva}</td>
                <td className={f.peor ? "whitespace-nowrap py-2 tabular-nums text-status-danger-fg" : "whitespace-nowrap py-2 tabular-nums text-soft"}>
                  {f.diferencia ?? "—"}
                  {f.diferencia && f.peor && <span className="sr-only"> (peor)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {senal && <p className="text-xs text-soft">{senal}</p>}

      {advertencias.length > 0 && (
        <ul className="flex flex-col gap-1">
          {advertencias.map((a) => (
            <li
              key={a}
              className="flex gap-2 rounded-md border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-body"
            >
              <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-fg" />
              {a} No frena la publicación.
            </li>
          ))}
        </ul>
      )}

      {puedeOperar && (
        <div className="flex flex-col gap-2">
          {noPublicar && (
            <p className="text-sm text-body" role="status">
              {noPublicar}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {prueba.puede_publicar && (
              <Button variant="accent" size="sm" onClick={publicar} disabled={pending}>
                Publicar para todos
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setCambiando(true)} disabled={pending}>
              Cambiar porcentaje
            </Button>
            <Button variant="ghost" size="sm" onClick={detener} disabled={pending}>
              Detener la prueba
            </Button>
          </div>
        </div>
      )}

      <DialogoPorcentaje
        key={cambiando ? "abierto" : "cerrado"}
        abierto={cambiando}
        onCerrar={() => setCambiando(false)}
        titulo="Cambiar el porcentaje de la prueba"
        inicial={prueba.percent}
        confirmar="Guardar porcentaje"
        pending={pending}
        onConfirmar={async (percent) => {
          const ok = await run(async () => {
            const r = await enviar(base, "PATCH", { percent });
            return r.ok
              ? { ok: true, success: `La prueba ahora atiende el ${percent} % de las conversaciones nuevas.` }
              : { ok: false, status: r.status, error: mensajeDeError(r.json.code, r.json.error) };
          });
          if (ok) setCambiando(false);
        }}
      />
    </section>
  );
}

/** Diálogo con el porcentaje de la prueba (1 a 50): para iniciarla y para cambiarlo. Quien lo usa
 * le cambia la `key` al abrirlo, para que empiece en `inicial`. */
export function DialogoPorcentaje({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  inicial = PORCENTAJE_SUGERIDO,
  confirmar,
  pending,
  onConfirmar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  inicial?: number;
  confirmar: string;
  pending: boolean;
  onConfirmar: (percent: number) => void;
}) {
  const [percent, setPercent] = useState(inicial);
  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        if (!o) onCerrar();
      }}
    >
      <DialogContent title={titulo} description={descripcion}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirmar(percent);
          }}
        >
          <Field label="Porcentaje de conversaciones nuevas" htmlFor="porcentaje-prueba" help={textoPorcentaje(percent)}>
            <InputNumero
              id="porcentaje-prueba"
              value={percent}
              onValueChange={setPercent}
              min={PORCENTAJE_MIN}
              max={PORCENTAJE_MAX}
              className="w-28"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {confirmar}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
