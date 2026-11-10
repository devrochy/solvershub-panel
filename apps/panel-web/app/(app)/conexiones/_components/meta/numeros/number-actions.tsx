"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { BadgeCheck, KeyRound } from "lucide-react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { RegisterNumberDialog } from "./register-number-dialog";

/** Menú de un número: verificarlo con el código de Meta y, si falta, registrarlo. */
export function MenuNumero({
  connectionId,
  phoneNumberId,
  label,
  registrado,
}: {
  connectionId: string;
  phoneNumberId: string;
  label: string;
  registrado: boolean;
}) {
  const [verificar, setVerificar] = useState(false);
  const [registrar, setRegistrar] = useState(false);
  return (
    <>
      <MenuDeFila etiqueta={`Más acciones de ${label}`}>
        <DropdownMenuItem icon={<BadgeCheck />} onSelect={() => setVerificar(true)}>
          Verificar con código
        </DropdownMenuItem>
        {!registrado && (
          <DropdownMenuItem icon={<KeyRound />} onSelect={() => setRegistrar(true)}>
            Registrar
          </DropdownMenuItem>
        )}
      </MenuDeFila>
      <NumberActions connectionId={connectionId} phoneNumberId={phoneNumberId} label={label} abierto={verificar} onAbiertoChange={setVerificar} />
      {!registrado && (
        <RegisterNumberDialog connectionId={connectionId} phoneNumberId={phoneNumberId} label={label} abierto={registrar} onAbiertoChange={setRegistrar} />
      )}
    </>
  );
}

/** Verificación de un número: enviar código (SMS/llamada) y confirmarlo. */
function NumberActions({
  connectionId,
  phoneNumberId,
  label,
  abierto,
  onAbiertoChange,
}: {
  connectionId: string;
  phoneNumberId: string;
  label: string;
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
}) {
  const router = useRouter();
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
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent
        title="Verificar con código"
        description={label}
        className="max-w-md"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-body">Meta envía un código al número; escríbelo aquí para confirmar que es tuyo.</p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Recibirlo por" htmlFor={`method-${phoneNumberId}`} className="w-40">
              <Select
                id={`method-${phoneNumberId}`}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="SMS">Mensaje de texto</option>
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
