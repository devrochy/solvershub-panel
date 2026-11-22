"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ResultadoConPlan } from "@/components/domain/aviso-limite-de-plan";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { rutaDeFicha } from "@/lib/conexion-ficha";
import {
  BFF_TELEGRAM,
  errorDeToken,
  mensajeErrorTelegram,
  webhookAjeno,
  type ConexionTelegram,
} from "@/lib/conexion-telegram";

import { AvisoWebhookAjeno } from "./aviso-webhook-ajeno";

/**
 * Alta de un bot de Telegram (HU-CONN-27, ADR-0199), dentro del diálogo «Agregar conexión»: los pasos para crear el
 * bot en @BotFather, el token y un nombre. El backend valida el token con Telegram, guarda la conexión, registra el
 * webhook y lo confirma; aquí se abre la ficha. Si el bot ya mandaba sus mensajes a otra dirección (409
 * `webhook_ajeno`), se avisa y no se sigue sin confirmarlo. El token vive solo en este estado: el backend nunca lo
 * devuelve.
 */
export function AltaTelegram({ onVolver, onConectada }: { onVolver: () => void; onConectada: () => void }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [nombre, setNombre] = useState("");
  const [errorToken, setErrorToken] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  // `code` del último error: el 409 del plan (`plan_limit_conexiones`, `plan_channel_not_included`) sale con «Mejorar mi plan».
  const [codigo, setCodigo] = useState<string | undefined>();
  const [ajeno, setAjeno] = useState<string | null>(null);
  const [confirma, setConfirma] = useState(false);
  const [cargando, setCargando] = useState(false);

  function abrirFicha(connectionId: string) {
    onConectada();
    router.refresh();
    router.push(`${rutaDeFicha({ id: connectionId })}?alta=1`);
  }

  async function conectar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const deToken = errorDeToken(token);
    setErrorToken(deToken);
    if (deToken) return;
    setError(null);
    setCargando(true);
    const res = await fetch(BFF_TELEGRAM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bot_token: token.trim(),
        label: nombre.trim(),
        confirm_overwrite_webhook: ajeno !== null && confirma,
      }),
    }).finally(() => setCargando(false));
    const data = (await res.json().catch(() => ({}))) as Partial<ConexionTelegram> & {
      error?: string;
      code?: string;
      details?: Record<string, unknown>;
    };
    // 201 si se creó y 200 si el bot ya estaba conectado en este negocio.
    if (res.ok && data.connection_id) {
      abrirFicha(data.connection_id);
      return;
    }
    if (data.code === "webhook_ajeno") {
      setAjeno(webhookAjeno(data.details) ?? "");
      setConfirma(false);
      return;
    }
    const guardada = typeof data.details?.connection_id === "string" ? data.details.connection_id : null;
    if (data.code === "telegram_webhook_no_registrado" && guardada) {
      // El bot quedó guardado: la ficha muestra el error y deja repararlo.
      abrirFicha(guardada);
      return;
    }
    setError(mensajeErrorTelegram(data.code, data.error ?? "No se pudo conectar el bot."));
    setCodigo(data.code);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void conectar(e)} noValidate>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-body">
        <li>
          En Telegram, abre{" "}
          <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline">
            @BotFather
          </a>{" "}
          y escribe <span className="font-mono">/newbot</span>.
        </li>
        <li>Elige el nombre que verán tus clientes y un usuario que termine en «bot» (por ejemplo, mitienda_bot).</li>
        <li>Copia el token que te entrega y pégalo aquí. No lo compartas con nadie más.</li>
      </ol>
      <Field label="Token del bot" htmlFor="telegram_token" error={errorToken} required>
        <InputPassword
          id="telegram_token"
          etiqueta="token"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </Field>
      <Field label="Nombre en solvershub" htmlFor="telegram_nombre" help="Opcional. Si lo dejas vacío, usamos el @usuario del bot.">
        <Input
          id="telegram_nombre"
          autoComplete="off"
          maxLength={120}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </Field>
      {ajeno !== null && (
        <AvisoWebhookAjeno id="telegram_alta_confirma" url={ajeno} confirma={confirma} onConfirma={setConfirma} />
      )}
      <ResultadoConPlan error={error ?? undefined} code={codigo} />
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onVolver}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Volver
        </Button>
        <Button type="submit" variant="accent" loading={cargando} disabled={ajeno !== null && !confirma}>
          Conectar el bot
        </Button>
      </div>
    </form>
  );
}
