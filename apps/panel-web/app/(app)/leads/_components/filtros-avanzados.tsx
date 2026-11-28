"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

export type CampoAvanzado = {
  key: string;
  label: string;
  /** Valor completo (`clave:valor`) o vacío. */
  value: string;
  options: { value: string; label: string }[];
  help?: string;
};

/**
 * Filtros avanzados de Clientes en un diálogo. La barra principal deja solo lo de todos los días; aquí viven
 * datos del lead, motivo, valor y origen. El formulario conserva la búsqueda, canal, etapa y seguimiento en
 * campos ocultos para que aplicar un filtro avanzado no borre el resto.
 */
export function FiltrosAvanzados({
  basePath,
  campos,
  ocultos,
  activos,
  limpiarHref,
}: {
  basePath: string;
  campos: CampoAvanzado[];
  ocultos: { name: string; value: string }[];
  activos: number;
  limpiarHref: string;
}) {
  const [abierto, setAbierto] = useState(false);
  if (campos.length === 0) return null;
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setAbierto(true)}>
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Más filtros
        {activos > 0 && <span className="tabular-nums text-text-soft">({activos})</span>}
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent
          title="Filtros avanzados"
          description="Ajusta los datos del lead, el motivo, el valor o el origen. La búsqueda, el canal, la etapa y el seguimiento se conservan."
        >
          <form method="get" action={basePath} className="flex flex-col gap-4">
            {ocultos.map((oculto, indice) => (
              <input key={`${oculto.name}-${indice}`} type="hidden" name={oculto.name} value={oculto.value} />
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              {campos.map((campo) => (
                <Field
                  key={campo.key}
                  label={campo.label}
                  htmlFor={`avanzado-${campo.key}`}
                  help={campo.help}
                  className={campo.key === "lead_datos" ? "sm:col-span-2" : undefined}
                >
                  <Select id={`avanzado-${campo.key}`} name="filtro" defaultValue={campo.value}>
                    {campo.options.map((opcion) => (
                      <option key={opcion.value || "todos"} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-soft pt-4">
              <Button asChild type="button" variant="ghost">
                <Link href={limpiarHref}>Quitar filtros avanzados</Link>
              </Button>
              <Button type="submit" variant="accent">
                Aplicar filtros
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
