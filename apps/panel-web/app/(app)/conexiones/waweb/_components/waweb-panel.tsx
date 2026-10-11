"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Skeleton } from "@/components/ui/skeleton";

type State = {
  status: string;
  risk_ok: boolean;
  jid: string | null;
  qr_image: string | null;
  last_error: string | null;
};

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

  const connected = state.status.toLowerCase().includes("conect") || Boolean(state.jid);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Vínculo por QR</CardTitle>
          <Badge variant={connected ? "success" : "warning"}>
            {state.status || "sin sesión"}
            {state.last_error ? ` · ${state.last_error}` : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-sm text-body">
          Canal <strong>no oficial</strong>: usa un número propio vinculado por QR, con riesgo de
          suspensión por parte de WhatsApp. Úsalo solo con un número de repuesto.
        </p>

        {!state.risk_ok ? (
          <div className="flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4">
            <p className="text-sm text-status-warning-fg">
              Antes de generar el QR tienes que aceptar el aviso de riesgo.
            </p>
            <div>
              <Button variant="accent" size="sm" onClick={() => void run("accept-risk")} disabled={status.loading}>
                {status.loading ? "Registrando…" : "Acepto el riesgo"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-4">
            {state.jid ? (
              <p className="text-sm text-body">
                Vinculado como <span className="font-mono text-xs text-headline">{state.jid}</span>
              </p>
            ) : state.qr_image ? (
              <div className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.qr_image}
                  alt="Código QR para vincular WhatsApp"
                  className="h-56 w-56 rounded-md border border-border-soft bg-white p-2"
                />
                <p className="text-xs text-text-soft">
                  Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo. El código se
                  renueva solo.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-56 w-56" />
                <p className="text-xs text-text-soft">
                  Esperando el QR del conector… Si no aparece en unos segundos, reinicia el vínculo
                  (el código puede haber expirado).
                </p>
              </div>
            )}

            <Button
              variant={state.qr_image || state.jid ? "outline" : "accent"}
              size="sm"
              onClick={() => void run("reset")}
              disabled={status.loading}
            >
              {state.qr_image || state.jid ? "Reiniciar vínculo" : "Generar un QR nuevo"}
            </Button>
          </div>
        )}

        <FormFeedback error={status.error} success={status.success} />
      </CardContent>
    </Card>
  );
}
