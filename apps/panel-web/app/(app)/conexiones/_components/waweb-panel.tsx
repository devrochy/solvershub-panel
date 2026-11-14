"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Skeleton } from "@/components/ui/skeleton";
import type { WawebState } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { etiquetaPlataforma, nombreVinculado, telefonoVinculado } from "@/lib/waweb";

type State = WawebState;

// El conector rota el QR cada ~20 s; 3 s da feedback inmediato al reiniciar.
const POLL_MS = 3000;

/** Vínculo por QR del canal WhatsApp Web: acepta el aviso y muestra el QR vigente. */
export function WawebPanel({ initial }: { initial: State }) {
  const [state, setState] = useState<State>(initial);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  const refresh = useCallback(async () => {
    const res = await fetch("/api/meta/waweb");
    const json = (await res.json().catch(() => null)) as State | null;
    if (res.ok && json) setState(json);
  }, []);

  useEffect(() => {
    if (!state.risk_ok) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [state.risk_ok, refresh]);

  async function run(action: "accept-risk" | "reset") {
    setStatus({ loading: true });
    const res = await fetch("/api/meta/waweb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo completar la acción." });
      return;
    }
    setStatus({ success: action === "reset" ? "Vínculo reiniciado." : "Aviso aceptado." });
    await refresh();
  }

  const connected =
    Boolean(state.jid || state.phone) || /^(conectad|connected)/i.test(state.status);
  const nombre = nombreVinculado(state);
  const numero = telefonoVinculado(state);
  const plataforma = etiquetaPlataforma(state.platform);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle as="h3">{connected ? "Vinculado" : "Vincula tu teléfono"}</CardTitle>
          <Badge variant={connected ? "success" : "warning"}>{connected ? "Conectado" : "Sin vincular"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          <strong className="font-semibold">Canal no oficial:</strong> WhatsApp puede suspender este número. Úsalo solo
          con un número de repuesto.
        </p>
        {state.last_error && <p className="text-sm text-status-danger-fg">Último problema: {state.last_error}</p>}

        {!state.risk_ok ? (
          <div className="flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4">
            <p className="text-sm text-status-warning-fg">
              Antes de ver el código, confirma que entiendes el riesgo.
            </p>
            <div>
              <Button variant="accent" onClick={() => void run("accept-risk")} disabled={status.loading}>
                {status.loading ? "Registrando…" : "Acepto el riesgo"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            {state.jid || state.phone ? (
              <div className="flex w-full flex-col gap-2">
                {nombre && <p className="text-base font-medium text-headline">{nombre}</p>}
                <dl className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
                  {numero && (
                    <>
                      <dt className="text-text-soft">Número</dt>
                      <dd className="font-medium tabular-nums text-headline">{numero}</dd>
                    </>
                  )}
                  {state.business_name && state.push_name && (
                    <>
                      <dt className="text-text-soft">Negocio</dt>
                      <dd className="text-body">{state.business_name}</dd>
                    </>
                  )}
                  {plataforma && (
                    <>
                      <dt className="text-text-soft">Dispositivo</dt>
                      <dd className="text-body">{plataforma}</dd>
                    </>
                  )}
                  {state.linked_at && (
                    <>
                      <dt className="text-text-soft">Vinculado el</dt>
                      <dd className="text-body">{formatDateTime(state.linked_at)}</dd>
                    </>
                  )}
                  {state.last_connected_at &&
                    state.last_connected_at !== state.linked_at && (
                      <>
                        <dt className="text-text-soft">Última conexión</dt>
                        <dd className="text-body">{formatDateTime(state.last_connected_at)}</dd>
                      </>
                    )}
                </dl>
              </div>
            ) : state.qr_image ? (
              <div className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.qr_image}
                  alt="Código QR para vincular WhatsApp"
                  className="h-56 w-56 rounded-md border border-border-soft bg-white p-2"
                />
                <p className="text-xs text-text-soft">
                  En tu teléfono abre WhatsApp › Dispositivos vinculados › Vincular dispositivo y apunta la
                  cámara a este código. Se renueva solo.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-56 w-56" />
                <p className="text-xs text-text-soft">
                  Preparando el código… Si no aparece en unos segundos, pide uno nuevo.
                </p>
              </div>
            )}

            <Button
              variant={state.qr_image || state.jid ? "outline" : "accent"}
              onClick={() => void run("reset")}
              disabled={status.loading}
            >
              {state.jid ? "Reiniciar vínculo" : "Pedir un código nuevo"}
            </Button>
          </div>
        )}

        <FormFeedback error={status.error} success={status.success} />
      </CardContent>
    </Card>
  );
}
