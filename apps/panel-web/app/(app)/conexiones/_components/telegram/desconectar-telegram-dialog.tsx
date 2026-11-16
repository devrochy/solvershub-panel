"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { InputPassword } from "@/components/ui/input-password";
import { avisoDesconectadoTelegram, BFF_TELEGRAM, mensajeErrorTelegram } from "@/lib/conexion-telegram";
import { toast } from "@/lib/toast-store";

/**
 * Desconecta un bot de Telegram (ADR-0199) con `POST /telegram/{id}/disconnect` en vez del borrado genérico (que el
 * backend rechaza con 409 para un bot): le quita el webhook en Telegram y después borra la conexión, así el bot queda
 * libre. Si Telegram no responde, el backend no borra nada (502 `webhook_no_eliminado`) y aquí se ofrece seguir igual.
 */
export function DesconectarTelegramDialog({
  connectionId,
  label,
  redirectTo,
  open,
  onOpenChange,
}: {
  connectionId: string;
  label: string;
  redirectTo?: string;
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [confirmo, setConfirmo] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sinQuitar, setSinQuitar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function alCambiar(next: boolean) {
    if (!next) {
      setConfirmo(false);
      setPassword("");
      setError(null);
      setSinQuitar(false);
    }
    onOpenChange(next);
  }

  async function desconectar(continuarSiFalla: boolean) {
    setEnviando(true);
    setError(null);
    const res = await fetch(`${BFF_TELEGRAM}/${encodeURIComponent(connectionId)}/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, continuar_si_falla: continuarSiFalla }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; webhook_quitado?: boolean };
    setEnviando(false);
    if (!res.ok) {
      setSinQuitar(json.code === "webhook_no_eliminado");
      setError(mensajeErrorTelegram(json.code, json.error ?? "No se pudo desconectar el bot."));
      return;
    }
    toast.success(avisoDesconectadoTelegram(json.webhook_quitado === true));
    alCambiar(false);
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void desconectar(false);
  }

  return (
    <Dialog open={open} onOpenChange={alCambiar}>
      <DialogContent title="Desconectar el bot" description={label} className="max-w-md">
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <p className="text-sm text-body">
            El agente deja de atender por este bot y el bot queda libre para conectarlo de nuevo. Le quitamos el webhook en
            Telegram y descartamos los mensajes que tuviera pendientes. El historial se conserva.
          </p>
          <Checkbox
            id={`telegram-desconectar-confirmo-${connectionId}`}
            label="Entiendo que el bot se desconecta de solvershub."
            checked={confirmo}
            onCheckedChange={setConfirmo}
          />
          <Field label="Contraseña actual" htmlFor={`telegram-desconectar-${connectionId}`} required>
            <InputPassword
              id={`telegram-desconectar-${connectionId}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <FormFeedback error={error} />
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            {sinQuitar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enviando || !confirmo || !password}
                onClick={() => void desconectar(true)}
              >
                Desconectar igual
              </Button>
            )}
            <Button type="submit" variant="danger" size="sm" loading={enviando} disabled={!confirmo || !password}>
              {sinQuitar ? "Reintentar" : "Desconectar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
