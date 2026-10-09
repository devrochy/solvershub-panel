"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Circle, CircleDot, Compass } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PasoPrimerosPasos, PrimerosPasos as DatosDePrimerosPasos } from "@/lib/api/types";
import { estadoPasoLabel } from "@/lib/labels";
import { PASOS_PLEGADOS_COOKIE, copiaDelPaso, porcentajeDeAvance } from "@/lib/primeros-pasos";
import { cn } from "@/lib/utils";

function IconoDeEstado({ estado }: { estado: PasoPrimerosPasos["estado"] }) {
  // El estado también va en texto (sr-only o la insignia): el color nunca es el único portador.
  if (estado === "completo") return <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />;
  if (estado === "en_curso") return <CircleDot className="h-5 w-5 shrink-0 text-warning" aria-hidden />;
  return <Circle className="h-5 w-5 shrink-0 text-text-soft" aria-hidden />;
}

function FilaDePaso({ paso }: { paso: PasoPrimerosPasos }) {
  const copia = copiaDelPaso(paso);
  const completo = paso.estado === "completo";
  return (
    <li className="flex flex-wrap items-start gap-3 py-3 sm:flex-nowrap">
      <IconoDeEstado estado={paso.estado} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", completo ? "text-body" : "text-headline")}>
          {copia.titulo}
          <span className="sr-only"> ({estadoPasoLabel(paso.estado)})</span>
        </p>
        <p className="text-sm text-text-soft">{copia.descripcion}</p>
      </div>
      <div className="flex w-full justify-end sm:w-auto">
        {completo ? (
          <Badge variant="success">{estadoPasoLabel(paso.estado)}</Badge>
        ) : paso.puede_actuar && copia.href ? (
          <Button asChild size="sm" variant="outline">
            <Link href={copia.href}>{copia.accion}</Link>
          </Button>
        ) : paso.estado === "en_curso" ? (
          <Badge variant="warning">{estadoPasoLabel(paso.estado)}</Badge>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Primeros pasos del Resumen (HU-SH-06): el checklist que calcula el backend del estado real
 * del negocio. Cada paso lleva a donde se resuelve, solo si el usuario puede actuar ahí
 * (§1.3: nunca un 403 por diseño). La lista se puede plegar; la preferencia queda en una
 * cookie no secreta para que el servidor la pinte igual (sin salto al cargar).
 */
export function PrimerosPasos({
  datos,
  plegadoInicial = false,
  onVerRecorrido,
  idVerRecorrido,
}: {
  datos: DatosDePrimerosPasos;
  plegadoInicial?: boolean;
  onVerRecorrido?: () => void;
  /** Id del botón «Ver recorrido» (el recorrido le devuelve el foco al cerrar). */
  idVerRecorrido?: string;
}) {
  const [plegado, setPlegado] = useState(plegadoInicial);
  const listaId = useId();
  const porcentaje = porcentajeDeAvance(datos.completos, datos.total);

  function alternar() {
    const siguiente = !plegado;
    setPlegado(siguiente);
    document.cookie = siguiente
      ? `${PASOS_PLEGADOS_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
      : `${PASOS_PLEGADOS_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }

  return (
    <Card data-tour="primeros-pasos" role="region" aria-labelledby={`${listaId}-titulo`}>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle id={`${listaId}-titulo`}>Primeros pasos</CardTitle>
            <CardDescription>
              Deja tu asistente listo para atender. {datos.completos} de {datos.total} listos.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {onVerRecorrido && (
              <Button id={idVerRecorrido} variant="ghost" size="sm" onClick={onVerRecorrido} type="button">
                <Compass className="h-4 w-4" aria-hidden />
                Ver recorrido
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={alternar}
              type="button"
              aria-expanded={!plegado}
              aria-controls={listaId}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-150", plegado && "-rotate-90")}
                aria-hidden
              />
              {plegado ? "Mostrar pasos" : "Ocultar pasos"}
            </Button>
          </div>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-pill bg-hover"
          role="progressbar"
          aria-label="Avance de los primeros pasos"
          aria-valuenow={datos.completos}
          aria-valuemin={0}
          aria-valuemax={datos.total}
          aria-valuetext={`${datos.completos} de ${datos.total} pasos listos`}
        >
          <div
            className="h-full rounded-pill bg-accent transition-[width] duration-200"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </CardHeader>
      <CardContent id={listaId} hidden={plegado}>
        <ol className="flex flex-col divide-y divide-border-soft">
          {datos.pasos.map((paso) => (
            <FilaDePaso key={paso.clave} paso={paso} />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
