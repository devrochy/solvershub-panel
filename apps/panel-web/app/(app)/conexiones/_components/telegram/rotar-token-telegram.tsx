"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { InputPassword } from "@/components/ui/input-password";
import { BFF_TELEGRAM, errorDeToken, mensajeErrorTelegram, webhookAjeno } from "@/lib/conexion-telegram";
import { useAction } from "@/lib/use-action";

import { AvisoWebhookAjeno } from "./aviso-webhook-ajeno";

/**
 * Cambiar el token del mismo bot (`PUT …/credentials`), por ejemplo tras revocarlo en @BotFather. Pide la contraseña
 * del usuario; el backend lo valida con Telegram antes de guardar. Un token de otro bot es 409 `otro_bot`: eso es otra
 * conexión. Si el bot ya manda sus mensajes a otra dirección, se pide confirmar el reemplazo.
 */
export function RotarTokenTelegram({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [errorToken, setErrorToken] = useState<string>();
  const [ajeno, setAjeno] = useState<string | null>(null);
  const [confirma, setConfirma] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const deToken = errorDeToken(token);
    setErrorToken(deToken);
    if (deToken || !password) return;
    const ok = await run(async () => {
      const res = await fetch(`${BFF_TELEGRAM}/${encodeURIComponent(connectionId)}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: token.trim(), password, confirm_overwrite_webhook: ajeno !== null && confirma }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; details?: Record<string, unknown> };
      if (json.code === "webhook_ajeno") {
        setAjeno(webhookAjeno(json.details) ?? "");
        setConfirma(false);
      }
      return {
        ok: res.ok,
        status: res.status,
        error: mensajeErrorTelegram(json.code, json.error ?? "No se pudo cambiar el token."),
        success: "Token cambiado.",
      };
    });
    if (ok) {
      setToken("");
      setPassword("");
      setAjeno(null);
      setConfirma(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)} noValidate>
      <Field label="Token nuevo" htmlFor="telegram_rotar_token" error={errorToken} required>
        <InputPassword
          id="telegram_rotar_token"
          etiqueta="token"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </Field>
      <Field label="Tu contraseña" htmlFor="telegram_rotar_password" help="La pedimos para confirmar el cambio." required>
        <InputPassword
          id="telegram_rotar_password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="sm:max-w-xs"
        />
      </Field>
      {ajeno !== null && (
        <AvisoWebhookAjeno id="telegram_rotar_confirma" url={ajeno} confirma={confirma} onConfirma={setConfirma} />
      )}
      <div>
        <Button type="submit" variant="accent" loading={pending} disabled={!password || (ajeno !== null && !confirma)}>
          Cambiar el token
        </Button>
      </div>
    </form>
  );
}
