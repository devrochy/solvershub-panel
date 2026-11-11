"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropzone } from "@/components/ui/dropzone";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import { resumenDelImport } from "@/lib/aliados";

const esCsv = (archivo: File) => archivo.type === "text/csv" || archivo.name.toLowerCase().endsWith(".csv");

/**
 * Importa productos desde un archivo CSV (columnas `name` y `price`). Con aliados (HU-CRM-03), la
 * columna `aliado` y un aliado por defecto para las filas que no lo traen. Se abre desde «Más»
 * (VEN-08), así que el estado de abierto lo lleva quien lo usa.
 */
export function CsvImportDialog({
  allies = null,
  open,
  onOpenChange,
}: {
  allies?: { id: string; name: string }[] | null;
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!archivo || archivo.size === 0) {
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
    if (!res.ok) {
      const mensaje = typeof json.error === "string" ? json.error : json.error?.message;
      setStatus({ error: mensaje ?? "No se pudo importar el archivo." });
      return;
    }
    setStatus({ success: resumenDelImport(json.created ?? 0, json.unknown_allies) });
    setArchivo(null);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) {
          setArchivo(null);
          setStatus({});
        }
        onOpenChange(abierto);
      }}
    >
      <DialogContent
        title="Importar productos desde un archivo"
        description={
          allies
            ? "Un CSV con las columnas name y price. Opcionales: description, sku, stock, image_url (un link https) y aliado (el nombre del aliado)."
            : "Un CSV con las columnas name y price. Opcionales: description, sku, stock e image_url (un link https)."
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Dropzone
            accept={["text/csv"]}
            esAdmitido={esCsv}
            label={archivo ? archivo.name : "Arrastra el archivo CSV o elígelo"}
            hint={archivo ? "Listo para importar." : "Lo exportas desde Excel o Google Sheets como CSV."}
            icono={<FileSpreadsheet aria-hidden className="h-4 w-4 text-text-soft" />}
            onFiles={(archivos) => {
              setArchivo(archivos[0]);
              setStatus({});
            }}
            onReject={(motivo) => setStatus({ error: motivo })}
          />
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
          <FormFeedback error={status.error} success={status.success} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {status.success ? "Listo" : "Cancelar"}
            </Button>
            <Button type="submit" variant="accent" loading={status.loading} disabled={!archivo}>
              Importar productos
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
