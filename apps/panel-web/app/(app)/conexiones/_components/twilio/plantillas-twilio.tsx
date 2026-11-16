"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Send, Trash2 } from "lucide-react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BFF_TWILIO,
  MAX_CUERPO_PLANTILLA,
  accionesDePlantilla,
  cuerpoDePlantilla,
  erroresDePlantilla,
  mensajeErrorTwilio,
  variablesDeCuerpo,
  type PlantillaTwilio,
} from "@/lib/conexion-twilio";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";

const base = (connectionId: string) => `${BFF_TWILIO}/${encodeURIComponent(connectionId)}/templates`;

async function llamar(url: string, method: "POST" | "DELETE", exito: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  return {
    ok: res.ok,
    status: res.status,
    error: mensajeErrorTwilio(json.code, json.error ?? "No se pudo completar la acción."),
    success: exito,
  };
}

/** Trae de Twilio todas las plantillas de la cuenta (también las de su consola y, en el Sandbox, las preaprobadas). */
export function SincronizarPlantillasTwilio({ connectionId }: { connectionId: string }) {
  const { run, pending } = useAction();
  return (
    <Button
      variant="ghost"
      loading={pending}
      onClick={() => void run(() => llamar(`${base(connectionId)}/sync`, "POST", "Plantillas al día."))}
    >
      {!pending && <RefreshCw className="h-4 w-4" aria-hidden />} Sincronizar
    </Button>
  );
}

/** Menú de una plantilla: enviarla a aprobación, consultar su estado y borrarla, según lo que permita. */
export function MenuPlantillaTwilio({
  connectionId,
  plantilla,
  sandbox,
}: {
  connectionId: string;
  plantilla: Pick<PlantillaTwilio, "id" | "nombre" | "estado" | "content_sid">;
  sandbox: boolean;
}) {
  const { run } = useAction();
  const confirm = useConfirm();
  const acciones = accionesDePlantilla(plantilla, sandbox);
  if (!acciones.enviar && !acciones.refrescar && !acciones.borrar) return null;
  const url = `${base(connectionId)}/${encodeURIComponent(plantilla.id)}`;

  async function borrar() {
    const ok = await confirm({
      title: `¿Borrar «${plantilla.nombre}»?`,
      description: "Se borra también en tu cuenta de Twilio. No se puede deshacer.",
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (ok) await run(() => llamar(url, "DELETE", "Plantilla borrada."));
  }

  return (
    <MenuDeFila etiqueta={`Más acciones de ${plantilla.nombre}`}>
      {acciones.enviar && (
        <DropdownMenuItem
          icon={<Send />}
          onSelect={() => void run(() => llamar(`${url}/submit`, "POST", "Enviada a aprobación de WhatsApp."))}
        >
          Enviar a aprobación
        </DropdownMenuItem>
      )}
      {acciones.refrescar && (
        <DropdownMenuItem
          icon={<RefreshCw />}
          onSelect={() => void run(() => llamar(`${url}/refresh`, "POST", "Estado actualizado."))}
        >
          Consultar estado
        </DropdownMenuItem>
      )}
      {acciones.borrar && (
        <DropdownMenuItem icon={<Trash2 />} tone="danger" onSelect={() => void borrar()}>
          Borrar
        </DropdownMenuItem>
      )}
    </MenuDeFila>
  );
}

const VACIA = { nombre: "", idioma: "es", categoria: "UTILITY", cuerpo: "", ejemplos: {} as Record<string, string> };

/**
 * Crear una plantilla de texto en la cuenta de Twilio. Crear no la envía: la aprobación de WhatsApp se pide después
 * desde el menú de la fila. Cada `{{n}}` del mensaje abre su campo de ejemplo.
 */
export function NuevaPlantillaTwilio({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(VACIA);
  const [intentado, setIntentado] = useState(false);
  const [estado, setEstado] = useState<{ loading?: boolean; error?: string }>({});

  const variables = variablesDeCuerpo(form.cuerpo);
  const errores = erroresDePlantilla(form);
  // Un salto en las variables se avisa mientras se escribe; lo demás, al intentar crear.
  const conSaltos = !variables.every((n, i) => n === i + 1);
  const visibles: typeof errores = intentado ? errores : conSaltos ? { cuerpo: errores.cuerpo } : {};

  function cambiar(campo: "nombre" | "idioma" | "categoria" | "cuerpo", valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIntentado(true);
    if (Object.keys(errores).length > 0) return;
    setEstado({ loading: true });
    const res = await fetch(base(connectionId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpoDePlantilla(form)),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!res.ok) {
      setEstado({ error: mensajeErrorTwilio(json.code, json.error ?? "No se pudo crear la plantilla.") });
      return;
    }
    setEstado({});
    setOpen(false);
    setForm(VACIA);
    setIntentado(false);
    toast.success("Plantilla creada. Envíala a aprobación desde su menú para poder usarla.");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent">
          <Plus className="h-4 w-4" aria-hidden /> Nueva plantilla
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Nueva plantilla de WhatsApp"
        description="Se crea en tu cuenta de Twilio. Después la envías a aprobación de WhatsApp, que suele tardar unos minutos."
        className="max-h-[85vh] overflow-y-auto"
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nombre" htmlFor="tw-nombre" help="Minúsculas y guion bajo: recordatorio_cita" error={visibles.nombre}>
              <Input
                id="tw-nombre"
                value={form.nombre}
                maxLength={64}
                autoComplete="off"
                onChange={(e) => cambiar("nombre", e.target.value)}
              />
            </Field>
            <Field label="Idioma" htmlFor="tw-idioma" error={visibles.idioma}>
              <Select id="tw-idioma" value={form.idioma} onChange={(e) => cambiar("idioma", e.target.value)}>
                <option value="es">Español</option>
                <option value="es_CO">Español (Colombia)</option>
                <option value="es_MX">Español (México)</option>
                <option value="es_AR">Español (Argentina)</option>
                <option value="es_ES">Español (España)</option>
                <option value="en_US">Inglés (Estados Unidos)</option>
                <option value="pt_BR">Portugués (Brasil)</option>
              </Select>
            </Field>
            <Field label="Categoría" htmlFor="tw-categoria" error={visibles.categoria}>
              <Select id="tw-categoria" value={form.categoria} onChange={(e) => cambiar("categoria", e.target.value)}>
                <option value="UTILITY">Utilidad</option>
                <option value="MARKETING">Marketing</option>
                <option value="AUTHENTICATION">Autenticación</option>
              </Select>
            </Field>
          </div>
          <Field
            label="Mensaje"
            htmlFor="tw-cuerpo"
            help="Escribe {{1}}, {{2}}… donde va un dato del cliente, en orden y sin saltos."
            error={visibles.cuerpo}
          >
            <Textarea
              id="tw-cuerpo"
              rows={4}
              maxLength={MAX_CUERPO_PLANTILLA}
              value={form.cuerpo}
              onChange={(e) => cambiar("cuerpo", e.target.value)}
            />
          </Field>
          {variables.length > 0 && !conSaltos && (
            <fieldset className="flex flex-col gap-3 rounded-md border border-border-soft px-4 py-3">
              <legend className="px-1 text-sm font-medium text-headline">Ejemplos de las variables</legend>
              <p className="text-xs text-text-soft">WhatsApp los usa para revisar la plantilla; no se envían a tus clientes.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {variables.map((n) => (
                  <Field key={n} label={`{{${n}}}`} htmlFor={`tw-ejemplo-${n}`}>
                    <Input
                      id={`tw-ejemplo-${n}`}
                      value={form.ejemplos[String(n)] ?? ""}
                      maxLength={256}
                      onChange={(e) => setForm((f) => ({ ...f, ejemplos: { ...f.ejemplos, [String(n)]: e.target.value } }))}
                    />
                  </Field>
                ))}
              </div>
              {visibles.ejemplos && (
                <p role="alert" className="text-xs text-status-danger-fg">
                  {visibles.ejemplos}
                </p>
              )}
            </fieldset>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <FormFeedback error={estado.error} />
            <Button onClick={() => setOpen(false)} type="button" variant="ghost" className="ml-auto">
              Cancelar
            </Button>
            <Button type="submit" variant="accent" loading={estado.loading}>
              Crear plantilla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
