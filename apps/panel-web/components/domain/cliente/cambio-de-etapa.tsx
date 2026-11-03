"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_NOTA_PERDIDA } from "@/lib/clientes";
import type { ActionResult } from "@/lib/use-action";

/**
 * Cambio de etapa de un lead, compartido por el menú de la lista (HU-CRM-19) y el tablero de embudo
 * (HU-CRM-24): el mismo `PATCH` del pack que usa la ficha (ADR-0149), así que todas las vistas muestran lo
 * mismo y el cambio queda en la historia del cliente (HU-CRM-18).
 */
export async function cambiarEtapaEnServidor({
  leadId,
  pluginId,
  clave,
  valor,
  extra = {},
  nombre,
  etiqueta,
}: {
  leadId: string;
  pluginId: string;
  /** Clave del campo editable de la etapa (`estado_lead`). */
  clave: string;
  valor: string;
  /** Motivo y nota de la pérdida, si la etapa nueva es «perdido». */
  extra?: Record<string, string>;
  nombre: string;
  /** Nombre de la etapa nueva, para el aviso. */
  etiqueta: string;
}): Promise<ActionResult> {
  const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/pack/${encodeURIComponent(pluginId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valores: { [clave]: valor, ...extra } }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: unknown };
  return {
    ok: res.ok,
    status: res.status,
    error: typeof json.error === "string" ? json.error : undefined,
    success: `${nombre} pasó a ${etiqueta}.`,
  };
}

/**
 * Diálogo «¿Por qué se perdió?» (HU-CRM-23): el motivo es obligatorio y la nota opcional. No cambia nada
 * hasta confirmar; `alConfirmar` recibe el motivo y, si la hay, la nota.
 */
export function MotivoDePerdidaDialog({
  abierto,
  alCambiar,
  leadId,
  nombre,
  motivos,
  alConfirmar,
}: {
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  leadId: string;
  nombre: string;
  motivos: { value: string; label: string }[];
  alConfirmar: (extra: { motivo_perdida: string; nota_perdida?: string }) => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent
        title="¿Por qué se perdió?"
        description={`Elige el motivo para marcar a ${nombre} como perdido. Queda en su historia.`}
        className="max-w-md"
      >
        {/* El formulario solo existe con el diálogo abierto: cada apertura empieza vacía. */}
        <FormularioDeMotivo leadId={leadId} motivos={motivos} alConfirmar={alConfirmar} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioDeMotivo({
  leadId,
  motivos,
  alConfirmar,
}: {
  leadId: string;
  motivos: { value: string; label: string }[];
  alConfirmar: (extra: { motivo_perdida: string; nota_perdida?: string }) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | undefined>();

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo) {
      setError("Elige el motivo de la pérdida.");
      return;
    }
    alConfirmar({ motivo_perdida: motivo, ...(nota.trim() ? { nota_perdida: nota.trim() } : {}) });
  }

  return (
    <form onSubmit={confirmar} className="flex flex-col gap-4">
      <Field label="Motivo de la pérdida" htmlFor={`motivo-${leadId}`} error={error} required>
        <Select
          id={`motivo-${leadId}`}
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            setError(undefined);
          }}
        >
          <option value="">Elige un motivo</option>
          {motivos.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Nota (opcional)" htmlFor={`nota-${leadId}`} help={`Hasta ${MAX_NOTA_PERDIDA} caracteres.`}>
        <Textarea
          id={`nota-${leadId}`}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={MAX_NOTA_PERDIDA}
          rows={3}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="sm">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" variant="accent" size="sm">
          Marcar como perdido
        </Button>
      </div>
    </form>
  );
}
