"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Alta de plantilla en la WABA (queda pendiente de revisión de Meta). */
export function NewTemplateDialog({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>(
    {},
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ loading: true });
    const res = await fetch(
      `/api/meta/connections/${encodeURIComponent(connectionId)}/templates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: String(data.get("name") ?? ""),
          language: String(data.get("language") ?? "es"),
          category: String(data.get("category") ?? "UTILITY"),
          header_format: String(data.get("header_format") ?? "NONE"),
          header_text: String(data.get("header_text") ?? ""),
          body_text: String(data.get("body_text") ?? ""),
          body_param_names: String(data.get("body_param_names") ?? ""),
          body_param_examples: String(data.get("body_param_examples") ?? ""),
          footer_text: String(data.get("footer_text") ?? ""),
          buttons_json: String(data.get("buttons_json") ?? ""),
          parameter_format: String(data.get("parameter_format") ?? ""),
        }),
      },
    );
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setStatus({ loading: false });
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo crear la plantilla." });
      return;
    }
    setOpen(false);
    form.reset();
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
        description="Meta la revisa antes de que puedas usarla; suele tardar unos minutos. Por ahora el encabezado solo puede ser texto."
        className="max-h-[85vh] overflow-y-auto"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Nombre"
              htmlFor="name"
              help="En minúsculas y con guion bajo: recordatorio_cita"
            >
              <Input id="name" name="name" required />
            </Field>
            <Field label="Idioma" htmlFor="language">
              <Select id="language" name="language" defaultValue="es">
                <option value="es">Español</option>
                <option value="es_MX">Español (México)</option>
                <option value="es_AR">Español (Argentina)</option>
                <option value="es_ES">Español (España)</option>
                <option value="en_US">Inglés (Estados Unidos)</option>
                <option value="pt_BR">Portugués (Brasil)</option>
              </Select>
            </Field>
            <Field label="Categoría" htmlFor="category">
              <Select id="category" name="category" defaultValue="UTILITY">
                <option value="UTILITY">Utilidad</option>
                <option value="MARKETING">Marketing</option>
                <option value="AUTHENTICATION">Autenticación</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Formato del encabezado" htmlFor="header_format">
              <Select
                id="header_format"
                name="header_format"
                defaultValue="NONE"
              >
                <option value="NONE">Sin encabezado</option>
                <option value="TEXT">Texto</option>
              </Select>
            </Field>
            <Field label="Texto del encabezado" htmlFor="header_text">
              <Input id="header_text" name="header_text" />
            </Field>
          </div>
          <Field
            label="Mensaje"
            htmlFor="body_text"
            help="Escribe {{1}}, {{2}}… donde va un dato del cliente"
          >
            <Textarea id="body_text" name="body_text" required rows={4} />
          </Field>
          <Field
            label="Pie"
            htmlFor="footer_text"
            help="Una línea corta debajo del mensaje"
          >
            <Input id="footer_text" name="footer_text" />
          </Field>
          <details className="group rounded-md border border-border-soft px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-headline">
              Opciones avanzadas
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nombres de variables"
                  htmlFor="body_param_names"
                  help="separados por coma"
                >
                  <Input id="body_param_names" name="body_param_names" />
                </Field>
                <Field
                  label="Ejemplos de variables"
                  htmlFor="body_param_examples"
                  help="separados por coma"
                >
                  <Input id="body_param_examples" name="body_param_examples" />
                </Field>
              </div>
              <Field
                label="Botones (JSON)"
                htmlFor="buttons_json"
                help='Ej.: [{"type":"QUICK_REPLY","text":"Sí"}]'
              >
                <Textarea id="buttons_json" name="buttons_json" rows={2} />
              </Field>
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-3">
            <FormFeedback error={status.error} />
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
              className="ml-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" variant="accent" loading={status.loading}>
              Enviar a revisión
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
