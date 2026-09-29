"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Opcion = { id: string; nombre: string };
type Creado = { codigo: string; apiKey: string; gestor: string | null };

/** Genera un dispositivo para la app de campo: código + API key (se muestran una vez). */
export function DeviceCreateDialog({
  gestores,
  carteras,
}: {
  gestores: Opcion[];
  carteras: Opcion[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const [creado, setCreado] = useState<Creado | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch("/api/pack/cobranza/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gestor_id: String(data.get("gestor_id") ?? "") || null,
        cartera_id: String(data.get("cartera_id") ?? "") || null,
        imei: String(data.get("imei") ?? ""),
        whatsapp: String(data.get("whatsapp") ?? ""),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      codigo?: string;
      api_key?: string;
      gestor?: string | null;
      error?: string;
    };
    setStatus({ loading: false });
    if (!res.ok || !json.codigo || !json.api_key) {
      setStatus({ error: json.error ?? "No se pudo generar el dispositivo." });
      return;
    }
    setCreado({ codigo: json.codigo, apiKey: json.api_key, gestor: json.gestor ?? null });
    router.refresh();
  }

  function cerrar(valor: boolean) {
    setOpen(valor);
    if (!valor) {
      setCreado(null);
      setStatus({});
    }
  }

  return (
    <Dialog onOpenChange={cerrar} open={open}>
      <DialogTrigger asChild>
        <Button variant="accent">Generar dispositivo</Button>
      </DialogTrigger>
      <DialogContent
        title={creado ? "Dispositivo generado" : "Generar dispositivo"}
        description={
          creado
            ? "Copia la API key AHORA: no se vuelve a mostrar (en la base solo queda su hash)."
            : "El dispositivo queda activo y ligado al gestor y la cartera elegidos."
        }
      >
        {creado ? (
          <div className="flex flex-col gap-4">
            <Field label="Código (se escribe en la app)" htmlFor="codigo_out">
              <Input id="codigo_out" readOnly value={creado.codigo} className="font-mono text-xs" />
            </Field>
            <Field label="API key" htmlFor="api_key_out">
              <Input id="api_key_out" readOnly value={creado.apiKey} className="font-mono text-xs" />
            </Field>
            {creado.gestor && (
              <p className="text-sm text-body">Asignado a {creado.gestor}.</p>
            )}
            <div>
              <Button onClick={() => cerrar(false)} type="button">
                Listo
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Gestor" htmlFor="gestor_id">
              <Select id="gestor_id" name="gestor_id" defaultValue="">
                <option value="">Sin gestor</option>
                {gestores.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cartera" htmlFor="cartera_id">
              <Select id="cartera_id" name="cartera_id" defaultValue="">
                <option value="">Sin cartera</option>
                {carteras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="IMEI" htmlFor="imei">
                <Input id="imei" name="imei" />
              </Field>
              <Field label="WhatsApp del equipo" htmlFor="whatsapp">
                <Input id="whatsapp" name="whatsapp" />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={status.loading}>
                {status.loading ? "Generando…" : "Generar dispositivo"}
              </Button>
              <FormFeedback error={status.error} />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
