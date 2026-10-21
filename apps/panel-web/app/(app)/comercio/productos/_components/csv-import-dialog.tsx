"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { resumenDelImport } from "@/lib/aliados";

/**
 * Importa productos desde un CSV (columnas `name` y `price`). Con aliados (HU-CRM-03), la
 * columna `aliado` y un aliado por defecto para las filas que no lo traen.
 */
export function CsvImportDialog({ allies = null }: { allies?: { id: string; name: string }[] | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const archivo = data.get("file");
    if (!(archivo instanceof File) || archivo.size === 0) {
      setStatus({ error: "Elige un archivo CSV." });
      return;
    }
    const cuerpo = new FormData();
    cuerpo.set("file", archivo);
    const aliado = String(data.get("ally_id") ?? "");
    if (allies && aliado) cuerpo.set("ally_id", aliado);
    setStatus({ loading: true });
    const res = await fetch("/api/commerce/products/import", { method: "POST", body: cuerpo });
    const json = (await res.json().catch(() => ({}))) as {
      created?: number;
      unknown_allies?: string[];
      error?: string | { message?: string };
    };
    setStatus({ loading: false });
    if (!res.ok) {
      const mensaje = typeof json.error === "string" ? json.error : json.error?.message;
      setStatus({ error: mensaje ?? "No se pudo importar el CSV." });
      return;
    }
    setStatus({ success: resumenDelImport(json.created ?? 0, json.unknown_allies) });
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" aria-hidden /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Importar productos desde CSV"
        description={
          allies
            ? "El archivo debe traer las columnas name y price (opcionales: description, sku, stock, image_url con un link https y aliado con el nombre del aliado)."
            : "El archivo debe traer las columnas name y price (opcionales: description, sku, stock e image_url con un link https)."
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Archivo CSV" htmlFor="file">
            <Input accept=".csv,text/csv" id="file" name="file" required type="file" />
          </Field>
          {allies && (
            <Field
              label="Aliado por defecto"
              htmlFor="csv-ally"
              help="Para las filas sin columna aliado. Un nombre que no existe deja la fila sin aliado y sale en el resumen."
            >
              <Select id="csv-ally" name="ally_id" defaultValue="">
                <option value="">Sin aliado</option>
                {allies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading}>
              {status.loading ? "Importando…" : "Importar"}
            </Button>
            <FormFeedback error={status.error} success={status.success} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
