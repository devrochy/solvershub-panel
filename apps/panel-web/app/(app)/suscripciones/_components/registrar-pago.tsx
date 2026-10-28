"use client";

import { useState, type FormEvent } from "react";
import { Landmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import type { PagoRegistradoOut } from "@/lib/api/types";
import { descripcionDeRegistroDePago, mensajeDePagoRegistrado } from "@/lib/suscripciones-admin";
import { useAction } from "@/lib/use-action";

/**
 * Registra que el cliente pagó un cobro por transferencia (HU-SUB-26). Pide la referencia
 * (número de comprobante o texto) para poder conciliar con el extracto; el servidor marca el
 * cobro pagado, reactiva la suscripción y deja la acción en la auditoría con el usuario.
 */
export function RegistrarPago({
  cargo,
  cliente,
}: {
  cargo: { id: string; periodo: string; monto: number; moneda?: string | null };
  cliente: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [referencia, setReferencia] = useState("");
  const { run, pending } = useAction();
  const valida = referencia.trim().length >= 3;

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valida) return;
    const ok = await run(async () => {
      const res = await fetch(`/api/pack/pack_subscriptions/cargos/${cargo.id}/registrar-pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referencia: referencia.trim() }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, status: res.status, error: json.error ?? "No se pudo registrar el pago." };
      }
      return { ok: true, success: mensajeDePagoRegistrado((await res.json()) as PagoRegistradoOut) };
    });
    if (ok) {
      setAbierto(false);
      setReferencia("");
    }
  }

  return (
    <>
      <IconAction
        label={`Registrar pago por transferencia de ${cliente}`}
        tone="aprobar"
        onClick={() => setAbierto(true)}
        disabled={pending}
      >
        <Landmark className="h-4 w-4" aria-hidden />
      </IconAction>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent title="Registrar pago por transferencia" description={descripcionDeRegistroDePago(cargo, cliente)}>
          <form onSubmit={registrar} className="flex flex-col gap-4">
            <Field
              label="Referencia de la transferencia"
              htmlFor={`referencia-${cargo.id}`}
              help="Número del comprobante o un texto que la identifique (mínimo 3 caracteres)."
              required
            >
              <Input
                id={`referencia-${cargo.id}`}
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                maxLength={120}
                autoComplete="off"
                required
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!valida || pending}>
                {pending ? "Registrando…" : "Registrar pago"}
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
