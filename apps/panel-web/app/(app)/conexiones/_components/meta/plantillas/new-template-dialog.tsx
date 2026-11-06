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
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ loading: true });
    const res = await fetch(`/api/meta/connections/${encodeURIComponent(connectionId)}/templates`, {
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
    });
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
        description="Se crea en la WABA de esta conexión y queda pendiente de la revisión de Meta (los encabezados multimedia aún no están soportados)."
        className="max-h-[85vh] overflow-y-auto"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nombre" htmlFor="name" help="minúsculas, guiones bajos">
              <Input id="name" name="name" required />
            </Field>
            <Field label="Idioma" htmlFor="language">
              <Input id="language" name="language" defaultValue="es" required />
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
              <Select id="header_format" name="header_format" defaultValue="NONE">
                <option value="NONE">Sin encabezado</option>
                <option value="TEXT">Texto</option>
              </Select>
            </Field>
            <Field label="Texto del encabezado" htmlFor="header_text">
              <Input id="header_text" name="header_text" />
            </Field>
          </div>
          <Field label="Cuerpo" htmlFor="body_text" help="Usa {{1}}, {{2}}… para variables">
            <Textarea id="body_text" name="body_text" required rows={4} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombres de variables" htmlFor="body_param_names" help="separados por coma">
              <Input id="body_param_names" name="body_param_names" />
            </Field>
            <Field label="Ejemplos de variables" htmlFor="body_param_examples" help="separados por coma">
              <Input id="body_param_examples" name="body_param_examples" />
            </Field>
          </div>
          <Field label="Pie" htmlFor="footer_text">
            <Input id="footer_text" name="footer_text" />
          </Field>
          <Field label="Botones (JSON)" htmlFor="buttons_json" help='Ej.: [{"type":"QUICK_REPLY","text":"Sí"}]'>
            <Textarea id="buttons_json" name="buttons_json" rows={2} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Creando…" : "Crear plantilla"}
            </Button>
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancelar
            </Button>
            <FormFeedback error={status.error} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
