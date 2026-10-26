"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

import { DialogoPorcentaje } from "@/app/(app)/conexiones/[id]/versiones/_components/prueba-con-una-parte";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { Evaluation, ReleaseDiff, ReleaseSummary } from "@/lib/api/types";
import { TEXTO_PROBAR } from "@/lib/canary";
import { formatDateTime } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import {
  ETIQUETA_ESTADO,
  estadoDe,
  gruposDelDiff,
  mensajeDeError,
  publicacion,
  recorridosAMedir,
  textoPublicar,
  textoVolverAtras,
  type Estado,
} from "@/lib/versiones";

type Respuesta = { error?: string; code?: string };

async function enviar(
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; json: Respuesta & Record<string, unknown> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Respuesta };
}

const TONO: Record<Estado, "success" | "info" | "neutral" | "warning"> = {
  activa: "success",
  candidata: "info",
  detenida: "warning",
  anterior: "neutral",
  retirada: "warning",
};

/**
 * Lista de versiones de la conexión (HU-AOS-27). La activa permite volver a la anterior; cada
 * candidata muestra sus diferencias, el estado de las pruebas automáticas y las acciones. Las
 * acciones no se muestran a quien no puede usarlas (nunca un 403 por diseño). Con una versión en
 * prueba (HU-AOS-32) no se publica otra ni se vuelve atrás: primero se publica o se detiene la prueba.
 */
export function ListaDeVersiones({
  conexionId,
  versiones,
  mediciones,
  puedeOperar,
  puedeProbar,
}: {
  conexionId: string;
  versiones: ReleaseSummary[];
  mediciones: Record<string, Evaluation | null>;
  puedeOperar: boolean;
  /** ¿Se ofrece «Probar con una parte»? (Agent OS v3 y permiso de operar). */
  puedeProbar: boolean;
}) {
  const activa = versiones.find((v) => v.active) ?? null;
  const anterior = activa
    ? versiones.find((v) => !v.active && v.number < activa.number && v.lifecycle === "promoted")
    : undefined;
  const hayPrueba = versiones.some((v) => v.canary);
  const confirm = useConfirm();
  const { run, pending } = useAction();

  if (versiones.length === 0) {
    return (
      <p className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm text-body">
        Esta conexión todavía no tiene versiones. Se crean al publicar un agente desde «Agentes».
      </p>
    );
  }

  const volverAtras = async () => {
    if (!anterior) return;
    const ok = await confirm({
      title: `¿Volver a la versión ${anterior.number}?`,
      description: textoVolverAtras(anterior.number),
      confirmLabel: `Volver a la versión ${anterior.number}`,
    });
    if (!ok) return;
    await run(async () => {
      const r = await enviar(`/api/connections/${conexionId}/volver-atras`);
      return r.ok
        ? { ok: true, success: `La conexión volvió a la versión ${anterior.number}.` }
        : { ok: false, status: r.status, error: mensajeDeError(r.json.code, r.json.error) };
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {hayPrueba && puedeOperar && (
        <p className="rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-body">
          Hay una versión en prueba: publícala o detén la prueba antes de publicar otra o volver a la anterior.
        </p>
      )}
      <ul className="flex flex-col gap-4" aria-label="Versiones de la conexión">
        {versiones.map((v) => (
          <li key={v.id}>
            <TarjetaVersion
              conexionId={conexionId}
              version={v}
              estado={estadoDe(v, activa?.number ?? null)}
              medicion={mediciones[v.id] ?? null}
              puedeOperar={puedeOperar}
              puedeProbar={puedeProbar}
              hayPrueba={hayPrueba}
              pending={pending}
              run={run}
              onVolverAtras={v.active && anterior && puedeOperar && !hayPrueba ? volverAtras : undefined}
              numeroAnterior={anterior?.number}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TarjetaVersion({
  conexionId,
  version: v,
  estado,
  medicion,
  puedeOperar,
  puedeProbar,
  hayPrueba,
  pending,
  run,
  onVolverAtras,
  numeroAnterior,
}: {
  conexionId: string;
  version: ReleaseSummary;
  estado: Estado;
  medicion: Evaluation | null;
  puedeOperar: boolean;
  puedeProbar: boolean;
  hayPrueba: boolean;
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
  onVolverAtras?: () => void;
  numeroAnterior?: number;
}) {
  const confirm = useConfirm();
  const [abierto, setAbierto] = useState(false);
  const [diff, setDiff] = useState<ReleaseDiff | null>(null);
  const [errorDiff, setErrorDiff] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);
  const esCandidata = estado === "candidata";
  const deLaPlataforma = v.origin === "platform";
  const pub = publicacion(medicion);
  const base = `/api/connections/${conexionId}/versiones/${v.id}`;

  const verDiferencias = async () => {
    const abrir = !abierto;
    setAbierto(abrir);
    if (!abrir || diff) return;
    const res = await fetch(`${base}/diferencias`);
    const json = (await res.json().catch(() => ({}))) as ReleaseDiff & Respuesta;
    if (res.ok) setDiff(json);
    else setErrorDiff(mensajeDeError(json.code, json.error));
  };

  const publicar = async () => {
    const ok = await confirm({
      title: `¿Publicar la versión ${v.number} a todos?`,
      description: textoPublicar(v.number),
      confirmLabel: `Publicar la versión ${v.number}`,
      destructive: false,
    });
    if (!ok) return;
    await run(async () => {
      const r = await enviar(`${base}/publicar`);
      return r.ok
        ? { ok: true, success: `La versión ${v.number} quedó publicada.` }
        : { ok: false, status: r.status, error: mensajeDeError(r.json.code, r.json.error) };
    });
  };

  const probar = async (percent: number) => {
    const ok = await run(async () => {
      const r = await enviar(`${base}/probar`, { percent });
      return r.ok
        ? { ok: true, success: `La versión ${v.number} quedó en prueba con el ${percent} % de las conversaciones nuevas.` }
        : { ok: false, status: r.status, error: mensajeDeError(r.json.code, r.json.error) };
    });
    if (ok) setProbando(false);
  };

  const medir = () =>
    run(async () => {
      const r = await enviar(`${base}/medir`);
      return r.ok
        ? { ok: true, success: "La medición quedó en camino. Puede tardar unos minutos." }
        : { ok: false, status: r.status, error: mensajeDeError(r.json.code, r.json.error) };
    });

  const detener = async () => {
    const ok = await confirm({
      title: `¿Detener la versión ${v.number}?`,
      description:
        "No se podrá publicar. Si después quieres esos mismos cambios, haz un ajuste en el agente para crear una versión nueva.",
      confirmLabel: `Detener la versión ${v.number}`,
    });
    if (!ok) return;
    await run(async () => {
      const r = await enviar(`${base}/detener`);
      return r.ok
        ? { ok: true, success: `La versión ${v.number} quedó detenida.` }
        : { ok: false, status: r.status, error: mensajeDeError(r.json.code, r.json.error) };
    });
  };

  return (
    <article
      className="flex flex-col gap-3 rounded-lg border border-border-soft bg-surface p-4"
      aria-labelledby={`version-${v.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`version-${v.id}`} className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-headline">
          Versión {v.number}
          <Badge variant={TONO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>
          {deLaPlataforma && <Badge variant="info">De la plataforma</Badge>}
          {v.canary && <Badge variant="info">En prueba con una parte</Badge>}
        </h2>
        <span className="text-xs text-soft">{formatDateTime(v.created_at)}</span>
      </div>

      {deLaPlataforma && esCandidata && (
        <p className="flex gap-2 rounded-md border border-status-info-border bg-status-info-bg px-3 py-2 text-sm text-body">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-status-info-fg" />
          SolversHub preparó esta versión con una actualización de una habilidad. Revisa qué cambia; si no la quieres,
          puedes detenerla.
        </p>
      )}

      {esCandidata && (
        <p className={pub.puede ? "text-sm text-soft" : "text-sm text-body"} role={pub.puede ? undefined : "status"}>
          {pub.motivo ?? "Pasó las pruebas automáticas."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {estado !== "activa" && (
          <Button variant="outline" size="sm" onClick={verDiferencias} aria-expanded={abierto}>
            {abierto ? <ChevronUp aria-hidden className="h-4 w-4" /> : <ChevronDown aria-hidden className="h-4 w-4" />}
            Ver diferencias
          </Button>
        )}
        {esCandidata && puedeOperar && pub.puede && !hayPrueba && (
          <Button variant="accent" size="sm" onClick={publicar} disabled={pending}>
            Publicar a todos
          </Button>
        )}
        {esCandidata && puedeProbar && pub.puede && !hayPrueba && (
          <Button variant="outline" size="sm" onClick={() => setProbando(true)} disabled={pending}>
            Probar con una parte
          </Button>
        )}
        {esCandidata && puedeOperar && pub.medir && (
          <Button variant="outline" size="sm" onClick={medir} disabled={pending}>
            Medir ahora
          </Button>
        )}
        {esCandidata && puedeOperar && !v.canary && (
          <Button variant="ghost" size="sm" onClick={detener} disabled={pending}>
            Detener
          </Button>
        )}
        {onVolverAtras && (
          <Button variant="outline" size="sm" onClick={onVolverAtras} disabled={pending}>
            Volver a la versión {numeroAnterior}
          </Button>
        )}
      </div>

      <DialogoPorcentaje
        key={probando ? "abierto" : "cerrado"}
        abierto={probando}
        onCerrar={() => setProbando(false)}
        titulo={`Probar la versión ${v.number} con una parte de los clientes`}
        descripcion={TEXTO_PROBAR}
        confirmar="Empezar la prueba"
        pending={pending}
        onConfirmar={probar}
      />

      {abierto && (
        <div className="rounded-md border border-border-soft bg-bg-deep p-3 text-sm" aria-live="polite">
          {errorDiff && <p role="alert" className="text-status-danger-fg">{errorDiff}</p>}
          {!diff && !errorDiff && <p className="text-soft">Cargando las diferencias…</p>}
          {diff && <Diferencias diff={diff} />}
        </div>
      )}
    </article>
  );
}

function Diferencias({ diff }: { diff: ReleaseDiff }) {
  const grupos = gruposDelDiff(diff);
  const medira = recorridosAMedir(diff);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-soft">
        {diff.base ? `Frente a la versión ${diff.base}:` : "Es la primera versión de la conexión:"}
      </p>
      {grupos.length === 0 && <p className="text-body">No cambia nada que se vea en la conversación.</p>}
      {grupos.map((g) => (
        <section key={g.titulo} aria-label={g.titulo}>
          <h3 className="font-medium text-headline">{g.titulo}</h3>
          <ul className="mt-1 list-disc pl-5 text-body">
            {g.lineas.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      ))}
      {medira.length > 0 && (
        <p className="text-soft">Recorridos que se prueban antes de publicar: {medira.join(", ")}.</p>
      )}
    </div>
  );
}
