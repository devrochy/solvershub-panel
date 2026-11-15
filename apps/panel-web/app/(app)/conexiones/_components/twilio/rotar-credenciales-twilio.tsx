"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { BFF_TWILIO, erroresDeCredenciales, mensajeErrorTwilio, webhookPrevio } from "@/lib/conexion-twilio";
import { useAction } from "@/lib/use-action";

/**
 * Cambiar el Auth Token (o la cuenta) del número ya conectado (HU-CONN-13, `PUT …/credentials`). Pide la
 * contraseña del usuario; el backend valida contra Twilio antes de guardar. Si el número ya manda sus mensajes a
 * otra dirección, la API responde 422 y aquí se pide confirmar el reemplazo antes de reintentar.
 */
export function RotarCredencialesTwilio({ connectionId, accountSid }: { connectionId: string; accountSid: string }) {
  const { run, pending } = useAction();
  const [sid, setSid] = useState(accountSid);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<{ account_sid?: string; auth_token?: string }>({});
  const [previo, setPrevio] = useState<string | null>(null);
  const [confirma, setConfirma] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const encontrados = erroresDeCredenciales(sid, token);
    setErrores(encontrados);
    if (encontrados.account_sid || encontrados.auth_token || !password) return;
    const ok = await run(async () => {
      const res = await fetch(`${BFF_TWILIO}/${encodeURIComponent(connectionId)}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_sid: sid.trim(),
          auth_token: token.trim(),
          password,
          confirm_overwrite_webhook: previo !== null && confirma,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; details?: Record<string, unknown> };
      if (json.code === "webhook_overwrite_not_confirmed") {
        setPrevio(webhookPrevio(json.details) ?? "");
        setConfirma(false);
      }
      return {
        ok: res.ok,
        status: res.status,
        error: mensajeErrorTwilio(json.code, json.error ?? "No se pudieron cambiar las credenciales."),
        success: "Credenciales cambiadas.",
      };
    });
    if (ok) {
      setToken("");
      setPassword("");
      setPrevio(null);
      setConfirma(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account SID" htmlFor="twilio_rotar_sid" error={errores.account_sid} required>
          <Input
            id="twilio_rotar_sid"
            autoComplete="off"
            spellCheck={false}
            value={sid}
            onChange={(e) => setSid(e.target.value)}
          />
        </Field>
        <Field label="Auth Token nuevo" htmlFor="twilio_rotar_token" error={errores.auth_token} required>
          <InputPassword
            id="twilio_rotar_token"
            etiqueta="Auth Token"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Tu contraseña" htmlFor="twilio_rotar_password" help="La pedimos para confirmar el cambio." required>
        <InputPassword
          id="twilio_rotar_password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="sm:max-w-xs"
        />
      </Field>
      {previo !== null && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm"
        >
          <p className="flex items-start gap-2 text-headline">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-fg" aria-hidden />
            <span>
              El número ahora manda sus mensajes a otra dirección{previo ? <> (<span className="break-all">{previo}</span>)</> : null}.
              Si sigues, la reemplazamos por la de solvershub.
            </span>
          </p>
          <Checkbox id="twilio_rotar_confirma" label="Entiendo, reemplazar la dirección" checked={confirma} onCheckedChange={setConfirma} />
        </div>
      )}
      <div>
        <Button
          type="submit"
          variant="accent"
          loading={pending}
          disabled={!password || (previo !== null && !confirma)}
        >
          Cambiar credenciales
        </Button>
      </div>
    </form>
  );
}
