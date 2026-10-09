"use client";

import { useId, useState } from "react";
import { Compass } from "lucide-react";

import { PrimerosPasos } from "@/components/domain/primeros-pasos";
import { TourGuiado } from "@/components/domain/tour-guiado";
import { Button } from "@/components/ui/button";
import type { PrimerosPasos as DatosDePrimerosPasos } from "@/lib/api/types";
import { hayPasosParaActuar } from "@/lib/primeros-pasos";
import { cookieDelTour, type FinDelTour } from "@/lib/tour";

/**
 * Bienvenida del Resumen (HU-SH-06): en la primera visita ofrece el recorrido guiado y, mientras
 * queden pasos, muestra los primeros pasos (con su botón para volver a ver el recorrido).
 * Cómo terminó el recorrido queda en una cookie no secreta, que el servidor lee para no
 * volver a ofrecerlo.
 */
export function Bienvenida({
  datos,
  ofrecerRecorrido,
  pasosPlegados = false,
}: {
  datos: DatosDePrimerosPasos;
  ofrecerRecorrido: boolean;
  pasosPlegados?: boolean;
}) {
  const [ofrecer, setOfrecer] = useState(ofrecerRecorrido);
  const [recorrido, setRecorrido] = useState(false);
  const tituloId = useId();
  const verRecorridoId = useId();
  const pendientes = hayPasosParaActuar(datos.pasos);

  function terminar(fin: FinDelTour) {
    document.cookie = cookieDelTour(fin);
    setOfrecer(false);
    setRecorrido(false);
  }

  if (!pendientes && !recorrido) return null;

  return (
    <>
      {ofrecer && (
        <section
          aria-labelledby={tituloId}
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border-soft bg-surface p-5"
        >
          <div className="flex items-start gap-3">
            <Compass className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div>
              <h2 id={tituloId} className="font-display text-base font-semibold text-headline">
                ¿Primera vez aquí?
              </h2>
              <p className="text-sm text-body">Te mostramos el panel en 5 pasos. Toma un minuto.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={() => terminar("saltado")}>
              Ahora no
            </Button>
            <Button variant="accent" type="button" onClick={() => setRecorrido(true)}>
              Empezar recorrido
            </Button>
          </div>
        </section>
      )}
      {pendientes && (
        <PrimerosPasos
          datos={datos}
          plegadoInicial={pasosPlegados}
          onVerRecorrido={() => setRecorrido(true)}
          idVerRecorrido={verRecorridoId}
        />
      )}
      {recorrido && <TourGuiado onTerminar={terminar} respaldoDelFoco={verRecorridoId} />}
    </>
  );
}
