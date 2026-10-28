"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { mensajeAcceso, type MensajeAcceso } from "@/lib/acceso-dueno";
import type { TenantCreated } from "@/lib/api/types";

/** Alta de negocio (tenant) desde plataforma. */
export function NewTenantDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  // Resultado del acceso del dueño: no se cierra en silencio, así se ve si el correo salió.
  const [acceso, setAcceso] = useState<MensajeAcceso | null>(null);

  function cerrar(abierto: boolean) {
    setOpen(abierto);
    if (!abierto) {
      setAcceso(null);
      setStatus({});
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus({ loading: true });
    const res = await fetch("/api/platform/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        slug: String(data.get("slug") ?? ""),
        business: String(data.get("business") ?? ""),
        tone: String(data.get("tone") ?? "cercano"),
        admin_email: String(data.get("admin_email") ?? ""),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string } & Partial<TenantCreated>;
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo crear el negocio." });
      return;
    }
    setStatus({});
    router.refresh();
    const creado = json as Partial<TenantCreated>;
    if (creado.invitation) {
      setAcceso(mensajeAcceso(creado.invitation));
      return;
    }
    cerrar(false);
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogTrigger asChild>
        <Button variant="accent">Nuevo negocio</Button>
      </DialogTrigger>
      <DialogContent
        title="Nuevo negocio"
        description={
          acceso
            ? "Resultado del alta."
            : "Da de alta un negocio con su asistente. Al dueño le llega un correo para definir su contraseña."
        }
        className="max-w-xl"
      >
        {acceso ? (
          <div className="flex flex-col gap-4">
            <p
              role={acceso.tono === "aviso" ? "alert" : "status"}
              className={acceso.tono === "aviso" ? "text-sm text-status-warning-fg" : "text-sm text-status-success-fg"}
            >
              {acceso.texto}
            </p>
            <div className="flex justify-end">
              <Button type="button" variant="accent" onClick={() => cerrar(false)}>
                Listo
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="t-name" required>
                <Input id="t-name" name="name" required />
              </Field>
              <Field label="Slug" htmlFor="t-slug" help="Vacío = se deriva del nombre.">
                <Input id="t-slug" name="slug" autoComplete="off" />
              </Field>
            </div>
            <Field label="Descripción del negocio" htmlFor="t-business">
              <Input id="t-business" name="business" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tono" htmlFor="t-tone">
                <Select id="t-tone" name="tone" defaultValue="cercano">
                  <option value="cercano">Cercano</option>
                  <option value="formal">Formal</option>
                  <option value="neutral">Neutral</option>
                  <option value="informal">Informal</option>
                </Select>
              </Field>
              <Field
                label="Email del dueño"
                htmlFor="t-email"
                help="Le llega un enlace para definir su contraseña. Vacío = sin dueño."
              >
                <Input id="t-email" name="admin_email" type="email" autoComplete="off" />
              </Field>
            </div>

            <FormFeedback error={status.error} />

            <div className="mt-2 flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit" variant="accent" disabled={status.loading}>
                {status.loading ? "Creando…" : "Crear negocio"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
