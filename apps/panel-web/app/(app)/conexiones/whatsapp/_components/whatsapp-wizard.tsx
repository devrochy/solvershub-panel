"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { components } from "@/lib/api/schema";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RegistroPinForm } from "@/components/domain/registro-pin-form";

import { EmbeddedSignup } from "./embedded-signup";

type Estado = components["schemas"]["WizardState"];
type Sesion = components["schemas"]["WizardSessionOut"];

type AltaByok = components["schemas"]["WizardByokOut"];

async function enviar(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/meta/wizard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return res.ok
    ? { ok: true as const, data: json as unknown }
    : { ok: false as const, error: json.error ?? "No se pudo completar." };
}

/** Alta de WhatsApp (CON-16): con Facebook primero; con tu app de Meta y a mano, plegados debajo. */
export function WhatsappWizard({ estado, sesion }: { estado: Estado; sesion: Sesion | null }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: string; error?: string; success?: string }>({});
  const [entorno, setEntorno] = useState<"sandbox" | "production">("sandbox");
  // Alta BYOK que quedó esperando el registro del número con su PIN (HU-CONN-06).
  const [porRegistrar, setPorRegistrar] = useState<AltaByok | null>(null);

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

  async function onByok(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: "byok" });
    setPorRegistrar(null);
    const res = await enviar("byok", {
      app_id: String(data.get("app_id") ?? ""),
      app_secret: String(data.get("app_secret") ?? ""),
      phone_number_id: String(data.get("phone_number_id") ?? ""),
      access_token: String(data.get("access_token") ?? ""),
      waba_id: String(data.get("waba_id") ?? ""),
      verify_token: String(data.get("verify_token") ?? ""),
      environment: entorno,
    });
    if (!res.ok) {
      setStatus({ error: res.error });
      return;
    }
    const alta = res.data as AltaByok;
    const destino = alta.environment === "production" ? "de producción" : "de prueba";
    if (alta.needsRegistration) {
      setPorRegistrar(alta);
      setStatus({
        success: `Conexión ${destino} creada. Falta registrar el número con su PIN.`,
      });
    } else {
      setStatus({ success: `Conexión ${destino} creada y conectada.` });
    }
    router.refresh();
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
      "Conexión creada.",
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle as="h2">Conectar con Facebook</CardTitle>
            {estado.meta_configured ? <Badge variant="accent">Recomendado</Badge> : <Badge variant="warning">Sin configurar</Badge>}
          </div>
          <p className="text-sm text-body">Inicias sesión con Facebook, eliges tu número y listo. Es la forma más rápida.</p>
        </CardHeader>
        <CardContent>
          <EmbeddedSignup estado={estado} inicial={sesion} />
        </CardContent>
      </Card>

      <FormFeedback error={status.error} success={status.success} />

      <details className="group rounded-lg border border-border-soft bg-surface">
        <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 py-3">
          <span className="flex flex-col">
            <span className="text-sm font-medium text-headline">Con tu propia app de Meta</span>
            <span className="text-xs text-text-soft">Si ya tienes una app en Meta for Developers y prefieres usarla.</span>
          </span>
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-text-soft transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border-soft px-5 py-5">
          <form className="flex flex-col gap-4" onSubmit={(e) => void onByok(e)}>
            <Field
              label="Número"
              htmlFor="byok_environment"
              help={
                entorno === "production"
                  ? "Tu número real. La app tiene que estar en modo Live y el token debe ser permanente. Si el número no está registrado, después te pedimos su PIN."
                  : "El número de prueba que Meta crea en tu app (en «API Setup»). Después puedes pasarla a producción."
              }
            >
              <Select
                id="byok_environment"
                name="environment"
                value={entorno}
                onChange={(e) => setEntorno(e.target.value === "production" ? "production" : "sandbox")}
              >
                <option value="sandbox">El número de prueba de Meta</option>
                <option value="production">Mi número real</option>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Identificador de la app (App ID)" htmlFor="byok_app_id">
                <Input id="byok_app_id" name="app_id" required inputMode="numeric" />
              </Field>
              <Field label="Clave secreta de la app (App Secret)" htmlFor="byok_app_secret">
                <InputPassword etiqueta="clave secreta" id="byok_app_secret" name="app_secret" required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cuenta de WhatsApp Business (WABA ID)" htmlFor="byok_waba_id">
                <Input id="byok_waba_id" name="waba_id" required inputMode="numeric" />
              </Field>
              <Field label="Identificador del número (Phone number ID)" htmlFor="byok_phone">
                <Input id="byok_phone" name="phone_number_id" required inputMode="numeric" />
              </Field>
            </div>
            <Field label="Token de acceso" htmlFor="byok_token">
              <Textarea id="byok_token" name="access_token" required rows={2} />
            </Field>
            <Field
              label="Clave de verificación del webhook"
              htmlFor="byok_verify"
              help="Opcional: si la dejas vacía, creamos una para esta conexión."
            >
              <Input id="byok_verify" name="verify_token" />
            </Field>
            <div>
              <Button loading={status.loading === "byok"} type="submit" variant="outline">
                Conectar con mi app
              </Button>
            </div>
          </form>

          {porRegistrar && (
            <div className="mt-6 rounded-lg border border-status-warning-border bg-status-warning-bg p-4">
              <p className="font-medium text-headline">Registra el número con su PIN</p>
              <p className="mb-4 text-sm text-body">
                Meta todavía no tiene el número registrado: hasta registrarlo no envía ni recibe mensajes.
                {porRegistrar.registrationError ? ` ${porRegistrar.registrationError}` : ""}
              </p>
              <RegistroPinForm
                connectionId={porRegistrar.connectionId}
                phoneNumberId={porRegistrar.phoneNumberId}
                requerido={porRegistrar.environment === "production"}
                onRegistered={() => {
                  setPorRegistrar(null);
                  setStatus({ success: "Número registrado: la conexión quedó conectada." });
                }}
              />
            </div>
          )}
        </div>
      </details>

      <details className="group rounded-lg border border-border-soft bg-surface">
        <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 py-3">
          <span className="flex flex-col">
            <span className="text-sm font-medium text-headline">Con los datos a mano</span>
            <span className="text-xs text-text-soft">Por si lo anterior falla: pegas los identificadores y el token.</span>
          </span>
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-text-soft transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border-soft px-5 py-5">
          <form className="flex flex-col gap-4" onSubmit={onManual}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cuenta de WhatsApp Business (WABA ID)" htmlFor="manual_waba">
                <Input id="manual_waba" name="waba_id" required inputMode="numeric" />
              </Field>
              <Field label="Identificador del número (Phone number ID)" htmlFor="manual_phone">
                <Input id="manual_phone" name="phone_number_id" required inputMode="numeric" />
              </Field>
            </div>
            <Field label="Token de acceso" htmlFor="manual_token">
              <Textarea id="manual_token" name="token" required rows={2} />
            </Field>
            <Field label="Portafolio de Meta (Business ID)" htmlFor="manual_business" help="Opcional.">
              <Input id="manual_business" name="business_id" inputMode="numeric" />
            </Field>
            <div>
              <Button loading={status.loading === "manual"} type="submit" variant="outline">
                Crear la conexión
              </Button>
            </div>
          </form>
        </div>
      </details>
    </div>
  );
}
