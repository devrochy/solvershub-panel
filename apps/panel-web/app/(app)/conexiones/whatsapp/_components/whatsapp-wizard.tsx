"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Phone, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Estado = { meta_configured: boolean; app_id: string; config_id: string; environments: string[] };

async function enviar(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/meta/wizard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return res.ok ? { ok: true as const } : { ok: false as const, error: json.error ?? "No se pudo completar." };
}

/** Wizard de WhatsApp: Embedded Signup (SDK de Meta), BYOK y carga manual. */
export function WhatsappWizard({ estado }: { estado: Estado }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: string; error?: string; success?: string }>({});

  async function correr(action: string, payload: Record<string, unknown>, ok: string) {
    setStatus({ loading: action });
    const res = await enviar(action, payload);
    if (!res.ok) {
      setStatus({ error: res.error });
      return;
    }
    setStatus({ success: ok });
    router.refresh();
  }

  function onByok(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void correr(
      "byok",
      {
        app_id: String(data.get("app_id") ?? ""),
        app_secret: String(data.get("app_secret") ?? ""),
        phone_number_id: String(data.get("phone_number_id") ?? ""),
        access_token: String(data.get("access_token") ?? ""),
        waba_id: String(data.get("waba_id") ?? ""),
        verify_token: String(data.get("verify_token") ?? ""),
      },
      "Conexión BYOK creada.",
    );
  }

  function onManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void correr(
      "manual",
      {
        waba_id: String(data.get("waba_id") ?? ""),
        phone_number_id: String(data.get("phone_number_id") ?? ""),
        token: String(data.get("token") ?? ""),
        business_id: String(data.get("business_id") ?? ""),
      },
      "Conexión manual creada.",
    );
  }

  async function abrirEmbeddedSignup() {
    setStatus({ loading: "session" });
    const res = await enviar("session", { environment: "production" });
    if (!res.ok) {
      setStatus({ error: res.error });
      return;
    }
    setStatus({
      success:
        "Sesión del wizard creada. Carga el popup de Embedded Signup con el SDK de Facebook (app " +
        estado.app_id +
        ") y envía el código a /exchange.",
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {!estado.meta_configured && (
        <div role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p className="font-medium text-headline">Embedded Signup no disponible en este entorno</p>
          <p className="text-body">
            Faltan <code className="font-mono text-xs">META_APP_ID</code>,{" "}
            <code className="font-mono text-xs">META_APP_SECRET</code> y{" "}
            <code className="font-mono text-xs">META_CONFIG_ID</code> (ver el checklist). Mientras
            tanto puedes conectar por <strong>BYOK</strong> (app propia) o con la{" "}
            <strong>carga manual</strong>.
          </p>
        </div>
      )}

      <FormFeedback error={status.error} success={status.success} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-text-soft" aria-hidden />
            <CardTitle className="text-sm">Embedded Signup (app del framework)</CardTitle>
            {estado.meta_configured ? (
              <Badge variant="success">disponible</Badge>
            ) : (
              <Badge variant="warning">sin configurar</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Button disabled={!estado.meta_configured} onClick={() => void abrirEmbeddedSignup()} variant="accent">
            {status.loading === "session" ? "Abriendo…" : "Vincular con Embedded Signup"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-text-soft" aria-hidden />
            <CardTitle className="text-sm">BYOK: tu propia app de Meta</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onByok}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="App ID" htmlFor="byok_app_id">
                <Input id="byok_app_id" name="app_id" required />
              </Field>
              <Field label="App Secret" htmlFor="byok_app_secret">
                <Input id="byok_app_secret" name="app_secret" required type="password" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WABA ID" htmlFor="byok_waba_id">
                <Input id="byok_waba_id" name="waba_id" required />
              </Field>
              <Field label="Phone Number ID" htmlFor="byok_phone">
                <Input id="byok_phone" name="phone_number_id" required />
              </Field>
            </div>
            <Field label="Access token" htmlFor="byok_token">
              <Textarea id="byok_token" name="access_token" required rows={2} />
            </Field>
            <Field label="Verify token del webhook" htmlFor="byok_verify" help="Opcional.">
              <Input id="byok_verify" name="verify_token" />
            </Field>
            <div>
              <Button disabled={status.loading === "byok"} type="submit">
                {status.loading === "byok" ? "Guardando…" : "Conectar con BYOK"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-text-soft" aria-hidden />
            <CardTitle className="text-sm">Carga manual de respaldo</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onManual}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WABA ID" htmlFor="manual_waba">
                <Input id="manual_waba" name="waba_id" required />
              </Field>
              <Field label="Phone Number ID" htmlFor="manual_phone">
                <Input id="manual_phone" name="phone_number_id" required />
              </Field>
            </div>
            <Field label="Token de acceso" htmlFor="manual_token">
              <Textarea id="manual_token" name="token" required rows={2} />
            </Field>
            <Field label="Business ID" htmlFor="manual_business" help="Opcional.">
              <Input id="manual_business" name="business_id" />
            </Field>
            <div>
              <Button disabled={status.loading === "manual"} type="submit" variant="outline">
                {status.loading === "manual" ? "Validando…" : "Crear conexión manual"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
