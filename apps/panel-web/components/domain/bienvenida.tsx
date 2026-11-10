"use client";

import { useId, useState } from "react";

import { PrimerosPasos } from "@/components/domain/primeros-pasos";
import { TourGuiado } from "@/components/domain/tour-guiado";
import type { PrimerosPasos as DatosDePrimerosPasos } from "@/lib/api/types";
import { hayPasosParaActuar } from "@/lib/primeros-pasos";

/**
 * Bienvenida del Resumen (HU-SH-06): mientras queden pasos, muestra los primeros pasos, con un
 * botón para ver el recorrido guiado del panel.
 */
export function Bienvenida({
  datos,
  pasosPlegados = false,
}: {
  datos: DatosDePrimerosPasos;
  pasosPlegados?: boolean;
}) {
  const [recorrido, setRecorrido] = useState(false);
  const verRecorridoId = useId();
  const pendientes = hayPasosParaActuar(datos.pasos);

  if (!pendientes && !recorrido) return null;

  return (
    <>
      {pendientes && (
        <PrimerosPasos
          datos={datos}
          plegadoInicial={pasosPlegados}
          onVerRecorrido={() => setRecorrido(true)}
          idVerRecorrido={verRecorridoId}
        />
      )}
      {recorrido && <TourGuiado onTerminar={() => setRecorrido(false)} respaldoDelFoco={verRecorridoId} />}
    </>
  );
}
