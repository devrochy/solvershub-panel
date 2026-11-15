"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { InputPassword } from "@/components/ui/input-password";
import { avisoDesconectado, BFF_TWILIO, mensajeErrorTwilio } from "@/lib/conexion-twilio";
import { toast } from "@/lib/toast-store";

/**
 * Desconecta un número de WhatsApp vía Twilio (ADR-0186) con `POST /twilio/{id}/disconnect` en vez del borrado
 * genérico: además de borrar la conexión, puede devolverle al número los webhooks que tenía antes del alta. Si no
 * se pueden devolver, el backend no borra nada (502 `webhooks_no_restaurados`) y aquí se ofrece seguir sin ellos.
 */
export function DesconectarTwilioDialog({
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
  const [restaurar, setRestaurar] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sinRestaurar, setSinRestaurar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function alCambiar(next: boolean) {
    if (!next) {
      setConfirmo(false);
      setRestaurar(true);
      setPassword("");
      setError(null);
      setSinRestaurar(false);
    }
    onOpenChange(next);
  }

  async function desconectar(continuarSiFalla: boolean) {
    setEnviando(true);
    setError(null);
    const res = await fetch(`${BFF_TWILIO}/${encodeURIComponent(connectionId)}/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, restore_webhooks: restaurar, continuar_si_falla: continuarSiFalla }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; webhooks_restaurados?: boolean };
    setEnviando(false);
    if (!res.ok) {
      setSinRestaurar(json.code === "webhooks_no_restaurados");
      setError(mensajeErrorTwilio(json.code, json.error ?? "No se pudo desconectar el número."));
      return;
    }
    toast.success(avisoDesconectado(json.webhooks_restaurados === true, restaurar && !continuarSiFalla));
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
      <DialogContent title="Desconectar el número" description={label} className="max-w-md">
        <form onSubmit={enviar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm text-body">
            <p>El negocio deja de recibir y mandar mensajes por este número, y el número queda libre. El historial se conserva.</p>
            <p>
              Sus plantillas se dan de baja en solvershub: siguen en tu cuenta de Twilio, pero si vuelves a conectar el
              número no reaparecen aquí.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Checkbox
              id={`twilio-restaurar-${connectionId}`}
              label="Devolverle al número los webhooks que tenía antes de conectarlo"
              checked={restaurar}
              onCheckedChange={(v) => {
                setRestaurar(v);
                setSinRestaurar(false);
              }}
            />
            <p className="pl-6 text-xs text-text-muted">
              Si no, quedan apuntando a solvershub y Twilio sigue avisando a una dirección que ya no los recibe. Si en la
              consola de Twilio ya los moviste a otra integración, no se tocan.
            </p>
          </div>
          <Checkbox
            id={`twilio-desconectar-confirmo-${connectionId}`}
            label="Entiendo que el número se desconecta de solvershub."
            checked={confirmo}
            onCheckedChange={setConfirmo}
          />
          <Field label="Contraseña actual" htmlFor={`twilio-desconectar-${connectionId}`} required>
            <InputPassword
              id={`twilio-desconectar-${connectionId}`}
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
            {sinRestaurar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enviando || !confirmo || !password}
                onClick={() => void desconectar(true)}
              >
                Desconectar sin devolverlos
              </Button>
            )}
            <Button type="submit" variant="danger" size="sm" loading={enviando} disabled={!confirmo || !password}>
              {sinRestaurar ? "Reintentar" : "Desconectar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
