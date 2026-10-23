"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { formatDate } from "@/lib/format";
import {
  avisoDeVencimiento,
  estadoDeCuenta,
  etiquetaDeRuta,
  explicarDiagnostico,
  nombreDeCuenta,
  type CuentaDeInstagram,
} from "@/lib/instagram-alta";

const INTERVALO_MS = 3000;

type Prueba =
  | { fase: "esperando"; since: string; hasta: number }
  | { fase: "llego" }
  | { fase: "no_llego"; causa: string | null };

/**
 * Las cuentas de Instagram del negocio con su estado, y la prueba de humo (HU-CHAN-04): «Permitir acceso a los mensajes»
 * apagado en Instagram es un fallo silencioso que Meta nunca reporta. La persona manda un mensaje desde OTRO perfil y el
 * panel consulta cada 3 s, hasta 90 s, si llegó al webhook; si no, dice la causa más probable y qué revisar.
 */
export function InstagramCuentas({ cuentas }: { cuentas: CuentaDeInstagram[] }) {
  if (cuentas.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3" aria-label="Cuentas de Instagram conectadas">
      {cuentas.map((c) => (
        <li key={c.ig_user_id}>
          <TarjetaDeCuenta cuenta={c} />
        </li>
      ))}
    </ul>
  );
}

function TarjetaDeCuenta({ cuenta }: { cuenta: CuentaDeInstagram }) {
  const estado = estadoDeCuenta(cuenta);
  const vencimiento = avisoDeVencimiento(cuenta.token_expires_at);
  const [prueba, setPrueba] = useState<Prueba | null>(null);
  const [error, setError] = useState<string>();
  const activa = useRef(true);

  useEffect(() => {
    activa.current = true;
    return () => {
      activa.current = false; // al salir de la pantalla se deja de consultar
    };
  }, []);

  async function consultar(since: string, hasta: number) {
    if (!activa.current) return;
    const res = await fetch(
      `/api/meta/instagram/accounts/${encodeURIComponent(cuenta.ig_user_id)}/diagnostic?since=${encodeURIComponent(since)}`,
    );
    const json = (await res.json().catch(() => ({}))) as { error?: string; arrived?: boolean; likely_cause?: string | null };
    if (!activa.current) return;
    if (!res.ok) {
      setError(json.error ?? "No se pudo consultar la prueba.");
      setPrueba(null);
      return;
    }
    if (json.arrived) {
      setPrueba({ fase: "llego" });
      return;
    }
    if (Date.now() >= hasta) {
      setPrueba({ fase: "no_llego", causa: json.likely_cause ?? null });
      return;
    }
    setTimeout(() => void consultar(since, hasta), INTERVALO_MS);
  }

  async function empezar() {
    setError(undefined);
    const res = await fetch(`/api/meta/instagram/accounts/${encodeURIComponent(cuenta.ig_user_id)}/diagnostic`, {
      method: "POST",
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; since?: string; wait_seconds?: number };
    if (!res.ok || !json.since) {
      setError(json.error ?? "No se pudo empezar la prueba.");
      return;
    }
    const hasta = Date.now() + (json.wait_seconds ?? 90) * 1000;
    setPrueba({ fase: "esperando", since: json.since, hasta });
    setTimeout(() => void consultar(json.since as string, hasta), INTERVALO_MS);
  }

  const esperando = prueba?.fase === "esperando";
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{nombreDeCuenta(cuenta)}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{etiquetaDeRuta(cuenta.login_route)}</Badge>
          <Badge variant={estado.tono}>{estado.etiqueta}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {estado.ayuda && <p className="text-body">{estado.ayuda}</p>}
        {vencimiento && <p className="text-body">{vencimiento}</p>}
        {cuenta.token_expires_at && !vencimiento && (
          <p className="text-text-soft">Acceso vigente hasta el {formatDate(cuenta.token_expires_at)}; se renueva solo.</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" disabled={esperando} onClick={() => void empezar()}>
            {esperando ? "Esperando tu mensaje…" : "Probar que llegan los mensajes"}
          </Button>
        </div>
        <FormFeedback error={error} />

        {prueba?.fase === "esperando" && (
          <p role="status" className="flex items-start gap-2 text-body">
            <Hourglass className="mt-0.5 h-4 w-4 text-text-soft" aria-hidden />
            Envía ahora un mensaje directo a esta cuenta desde OTRO perfil de Instagram. Esperamos hasta 90 segundos.
          </p>
        )}
        {prueba?.fase === "llego" && (
          <p role="status" className="flex items-start gap-2 text-status-success-fg">
            <CheckCircle2 className="mt-0.5 h-4 w-4" aria-hidden />
            Llegó el mensaje de prueba: la cuenta está recibiendo mensajes.
          </p>
        )}
        {prueba?.fase === "no_llego" && <NoLlego causa={prueba.causa} />}
      </CardContent>
    </Card>
  );
}

function NoLlego({ causa }: { causa: string | null }) {
  const { titulo, pasos } = explicarDiagnostico(causa);
  return (
    <div role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3">
      <p className="flex items-center gap-2 font-medium text-headline">
        <XCircle className="h-4 w-4 text-status-warning-fg" aria-hidden />
        {titulo}
      </p>
      <ol className="mt-2 list-decimal pl-6 text-body">
        {pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
    </div>
  );
}
