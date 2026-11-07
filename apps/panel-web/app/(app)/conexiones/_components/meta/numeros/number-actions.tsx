"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** Verificación de un número: enviar código (SMS/llamada) y confirmarlo. */
export function NumberActions({
  connectionId,
  phoneNumberId,
  label,
}: {
  connectionId: string;
  phoneNumberId: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("SMS");
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function post(payload: Record<string, unknown>) {
    setStatus({ loading: true });
    const res = await fetch(
      `/api/meta/connections/${connectionId}/numbers/${encodeURIComponent(phoneNumberId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo completar la acción." });
      return false;
    }
    setStatus({ success: "Listo." });
    router.refresh();
    return true;
  }

  function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void post({ action: "verify", code: String(data.get("code") ?? "") });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Verificar
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Verificar número"
        description={label}
        className="max-w-md"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Método" htmlFor={`method-${phoneNumberId}`} className="w-40">
              <Select
                id={`method-${phoneNumberId}`}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="SMS">SMS</option>
                <option value="VOICE">Llamada</option>
              </Select>
            </Field>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void post({ action: "request-code", code_method: method })}
              disabled={status.loading}
            >
              Enviar código
            </Button>
          </div>

          <form onSubmit={onVerify} className="flex flex-col gap-3">
            <Field label="Código recibido" htmlFor={`code-${phoneNumberId}`} required>
              <Input id={`code-${phoneNumberId}`} name="code" required autoComplete="one-time-code" />
            </Field>
            <div>
              <Button type="submit" variant="accent" size="sm" disabled={status.loading}>
                Verificar código
              </Button>
            </div>
          </form>

          <FormFeedback error={status.error} success={status.success} />

          <div className="flex justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cerrar
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
