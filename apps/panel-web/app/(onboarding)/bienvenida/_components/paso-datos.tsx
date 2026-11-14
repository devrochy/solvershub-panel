"use client";

import { useState } from "react";

import { PasoDatos, type Cargado } from "@/app/(app)/agentes/nuevo/_components/paso-datos";
import { PasoLoCargado } from "@/app/(app)/agentes/nuevo/_components/paso-lo-cargado";
import { Button } from "@/components/ui/button";
import type { PasoPrimerosPasos, RegistroDePrueba } from "@/lib/api/types";
import type { EstadoDelAsistente } from "@/lib/onboarding";

import { PasoConocimiento } from "./paso-conocimiento";

/**
 * Paso 5 del primer uso (SPEC-45): con el agente ya creado, cargarle datos para probarlo en el paso siguiente.
 * Es el mismo paso «Datos» del asistente de Agentes: generar datos de prueba (solo en test), importar el catálogo
 * desde un CSV propio o desde fotos, y ver lo que quedó cargado. Debajo sigue el resumen de lo que ya hay y el
 * enlace a su pantalla. Todo es opcional: «Siguiente» lleva a probar aunque no se cargue nada.
 */
export function PasoDatosDeBienvenida({
  estado,
  agenteId,
  contenido,
  onRegistros,
}: {
  estado: EstadoDelAsistente;
  agenteId: string | null;
  contenido: PasoPrimerosPasos | null;
  /** Lo cargado, para sugerir frases al probar. */
  onRegistros: (registros: RegistroDePrueba[]) => void;
}) {
  const [cargado, setCargado] = useState<Cargado | null>(null);

  if (!agenteId) {
    return (
      <p role="status" className="max-w-xl rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-body">
        Primero crea tu agente en el paso anterior: los datos se le cargan a él.
      </p>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {cargado ? (
        <div className="flex flex-col gap-4">
          <PasoLoCargado agenteId={agenteId} locales={cargado.registros} resumen={cargado.resumen || null} onRegistros={onRegistros} />
          <div>
            <Button variant="outline" onClick={() => setCargado(null)}>
              Cargar otros datos
            </Button>
          </div>
        </div>
      ) : (
        <PasoDatos
          agenteId={agenteId}
          onCargado={(c) => {
            setCargado(c);
            onRegistros(c.registros);
          }}
        />
      )}
      <PasoConocimiento estado={estado} contenido={contenido} />
    </div>
  );
}
