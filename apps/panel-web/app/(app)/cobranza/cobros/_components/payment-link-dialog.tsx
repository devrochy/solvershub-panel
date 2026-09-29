"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

/** Crea un link de pago para el cobro del propietario (monto = cobro calculado). */
export function PaymentLinkDialog({ chargeId }: { chargeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/owner-charges/${chargeId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referencia: String(data.get("referencia") ?? ""),
        url: String(data.get("url") ?? ""),
      }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo crear el link." });
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Crear link
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Crear link de pago"
        description="El link queda asociado al período con su monto calculado (ej. pasarela o Nequi)."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Referencia" htmlFor="referencia">
            <Input id="referencia" name="referencia" placeholder="Ej. PAGO-2026-10" required />
          </Field>
          <Field label="URL" htmlFor="url" help="Debe empezar por http:// o https://">
            <Input id="url" name="url" type="url" placeholder="https://…" required />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Creando…" : "Crear link"}
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
