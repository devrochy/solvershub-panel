"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAction } from "@/lib/use-action";

export type CuentaOpcion = { id: string; email: string };

/** Alta manual de un equipo ya aprobado (caso: ya tienes el identificador del teléfono). */
export function AltaManual({ cuentas }: { cuentas: CuentaOpcion[] }) {
  const { run, pending } = useAction();
  const [abierto, setAbierto] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(async () => {
      const res = await fetch("/api/access/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id: String(data.get("cuenta") ?? ""),
          device_id: String(data.get("device") ?? "").trim(),
          label: String(data.get("label") ?? ""),
          plataforma: String(data.get("plataforma") ?? "android"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) setAbierto(false);
      return { ok: res.ok, status: res.status, error: json.error, success: "Equipo registrado y aprobado." };
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="h-4 w-4" aria-hidden /> Registrar equipo
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Registrar un equipo"
        description="Queda aprobado de inmediato para esa cuenta. El identificador aparece en la app, en Seguridad."
        className="max-w-md"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Field label="Cuenta" htmlFor="alta-cuenta" required>
            <Select id="alta-cuenta" name="cuenta" required defaultValue="">
              <option value="" disabled>
                Elige una cuenta
              </option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Identificador del equipo" htmlFor="alta-device" required>
            <Input id="alta-device" name="device" required minLength={4} maxLength={128} autoComplete="off" />
          </Field>
          <Field label="Nombre del equipo (opcional)" htmlFor="alta-label">
            <Input id="alta-label" name="label" maxLength={80} placeholder="Celular de Ana" />
          </Field>
          <Field label="Sistema" htmlFor="alta-plataforma">
            <Select id="alta-plataforma" name="plataforma" defaultValue="android">
              <option value="android">Android</option>
              <option value="ios">iPhone</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
