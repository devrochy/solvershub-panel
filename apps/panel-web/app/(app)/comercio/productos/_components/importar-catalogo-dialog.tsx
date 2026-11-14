"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ImportarCatalogo } from "@/components/domain/importar-catalogo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { ImportacionHecha, PlantillaImportacion } from "@/lib/api/types";
import { agenteQueImportaProductos, resumenDeImportacionDelCatalogo } from "@/lib/carga-de-datos";
import { toast } from "@/lib/toast-store";

/**
 * Importar el catálogo con IA desde Comercio › Productos (SPEC-45): la misma precarga del asistente de crear agente.
 * Las rutas de importación son por agente (ADR-0194) pero el catálogo es del negocio: se usa el primer agente cuya
 * plantilla de importación es `productos`, y a él se le anota el consumo de las fotos.
 */
export function ImportarCatalogoDialog({
  agentes,
  modo,
  onOpenChange,
}: {
  /** Especialistas del negocio, en orden: el primero que importa productos es el que se usa. */
  agentes: { id: string; name: string }[];
  /** `null` = cerrado. */
  modo: "csv" | "fotos" | null;
  onOpenChange: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [destino, setDestino] = useState<{ agenteId: string; plantilla: PlantillaImportacion } | null | undefined>(undefined);

  useEffect(() => {
    if (!modo || destino !== undefined) return;
    let vivo = true;
    void agenteQueImportaProductos(agentes.map((a) => a.id)).then((d) => {
      if (vivo) setDestino(d);
    });
    return () => {
      vivo = false;
    };
  }, [modo, destino, agentes]);

  function importado(hecha: ImportacionHecha) {
    toast.success(resumenDeImportacionDelCatalogo(hecha));
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={modo !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title={modo === "fotos" ? "Cargar productos desde fotos" : "Importar productos desde tu archivo"}
        description={
          modo === "fotos"
            ? "Una foto por producto: la IA propone nombre, categoría y precio si se ve. Cuesta créditos y te decimos cuántos antes."
            : "Sube tu lista con tus propias columnas: las reconocemos y la IA propone las que no. Revisas antes de cargar."
        }
        className="max-w-4xl"
      >
        <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          {destino === undefined ? (
            <p className="text-sm text-text-soft">Preparando la importación…</p>
          ) : destino === null ? (
            <FormFeedback error="Para importar con IA necesitas un agente de Ventas. Créalo en Agentes › Nuevo agente." />
          ) : (
            modo && (
              <ImportarCatalogo
                key={modo}
                agenteId={destino.agenteId}
                plantilla={destino.plantilla}
                modo={modo}
                onImportado={importado}
              />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
