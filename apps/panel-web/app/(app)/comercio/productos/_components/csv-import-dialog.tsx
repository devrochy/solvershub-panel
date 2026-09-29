"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

/** Importa productos desde un CSV (columnas `name` y `price`). */
export function CsvImportDialog() {
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
    setStatus({ loading: true });
    const res = await fetch("/api/commerce/products/import", { method: "POST", body: cuerpo });
    const json = (await res.json().catch(() => ({}))) as { created?: number; error?: string };
    setStatus({ loading: false });
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo importar el CSV." });
      return;
    }
    setStatus({ success: `Importados ${json.created ?? 0} productos.` });
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
        description="El archivo debe traer las columnas name y price (opcionales: description, sku, stock)."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Archivo CSV" htmlFor="file">
            <Input accept=".csv,text/csv" id="file" name="file" required type="file" />
          </Field>
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
