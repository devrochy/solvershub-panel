"use client";

import { useState, type FormEvent } from "react";
import { BadgeCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { PagoConfirmadoOut } from "@/lib/api/types";
import { descripcionDeConfirmacionDePago, mensajeDePagoConfirmado } from "@/lib/suscripciones-admin";
import { useAction } from "@/lib/use-action";

/**
 * Confirma a mano el pago de una inscripción que espera pago (transferencia) o de un cambio de plan
 * (HU-SUB-31). Pide la referencia del banco: el servidor activa la suscripción por el mismo camino que
 * el pago en línea y, si se repite la referencia, responde `ya_confirmado` sin duplicar nada.
 */
export function ConfirmarPago({
  suscripcionId,
  plan,
  cliente,
  cargo,
}: {
  suscripcionId: string;
  plan: string;
  cliente: string;
  cargo: { monto: number; moneda?: string | null; tipo?: string | null };
}) {
  const [abierto, setAbierto] = useState(false);
  const [referencia, setReferencia] = useState("");
  const { run, pending } = useAction();
  const valida = referencia.trim().length >= 3;

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valida) return;
    const ok = await run(async () => {
      const res = await fetch(`/api/pack/pack_subscriptions/suscripciones/${suscripcionId}/confirmar-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referencia: referencia.trim() }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, status: res.status, error: json.error ?? "No se pudo confirmar el pago." };
      }
      return { ok: true, success: mensajeDePagoConfirmado((await res.json()) as PagoConfirmadoOut) };
    });
    if (ok) {
      setAbierto(false);
      setReferencia("");
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`Confirmar pago de ${cliente}`}
        onClick={() => setAbierto(true)}
        disabled={pending}
      >
        <BadgeCheck className="h-4 w-4" aria-hidden />
        Confirmar pago
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent title="Confirmar pago" description={descripcionDeConfirmacionDePago(cargo, plan, cliente)}>
          <form onSubmit={confirmar} className="flex flex-col gap-4">
            <Field
              label="Referencia de la transferencia"
              htmlFor={`confirmar-${suscripcionId}`}
              help="Número del comprobante o un texto que la identifique (mínimo 3 caracteres)."
              required
            >
              <Input
                id={`confirmar-${suscripcionId}`}
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                maxLength={120}
                autoComplete="off"
                required
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!valida || pending}>
                {pending ? "Confirmando…" : "Confirmar pago"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
