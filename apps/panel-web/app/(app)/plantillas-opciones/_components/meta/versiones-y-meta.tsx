"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CloudUpload, ExternalLink, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthConnectionMeta, OpcionesMetaResultado, OpcionesPlantilla } from "@/lib/api/types";
import {
  FALLO_NO_ROMPE_LA_VERSION,
  avisoDeDegradacion,
  enlacePlantillasMeta,
  estadoDeVersion,
  nombreEnMeta,
} from "@/lib/plantillas-opciones-meta";

import { EstadoDeMeta } from "./estado-de-meta";
import { PublicarEnMeta } from "./publicar-en-meta";

const fecha = (iso: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

/**
 * Versiones publicadas y su plantilla de Meta (HU-OPC-04 y HU-OPC-06): para cada versión, si ya está en Meta y
 * en qué estado, y la acción de publicarla o reintentarla. Cada versión es una plantilla de Meta distinta
 * (`<clave>_v<n>`): una aprobada nunca se edita. Solo el propietario (o el master) escribe.
 */
export function VersionesYMeta({
  plantilla,
  conexiones,
  puedeEscribir,
  onActualizar,
  onBanderaApagada,
}: {
  plantilla: OpcionesPlantilla;
  conexiones: readonly HealthConnectionMeta[];
  puedeEscribir: boolean;
  /** Vuelve a leer la plantilla: el estado de Meta cambia por webhook, no por esta pantalla. */
  onActualizar: () => void | Promise<void>;
  onBanderaApagada?: () => void;
}) {
  // Respuesta del último intento por versión: trae `outcome` y `reintentable`, que la API no guarda.
  const [ultimos, setUltimos] = useState<Record<number, OpcionesMetaResultado>>({});
  // El diálogo vive aquí y no en la fila: al terminar, la plantilla se recarga y la fila deja de ofrecer la acción,
  // pero el resultado tiene que seguir a la vista hasta que el dueño lo cierre.
  const [abierta, setAbierta] = useState<{ version: number; reintento: boolean } | null>(null);
  const cerrar = useCallback(() => setAbierta(null), []);
  const alResultado = useCallback(
    (n: number) => (r: OpcionesMetaResultado) => {
      setUltimos((prev) => ({ ...prev, [n]: r }));
      void onActualizar();
    },
    [onActualizar],
  );

  if (plantilla.versiones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Versiones y plantilla de Meta</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-soft">
          Cuando publiques la plantilla podrás enviarla también a Meta, para que el mensaje salga con botones fuera de las 24 horas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Versiones y plantilla de Meta</CardTitle>
        <p className="text-sm text-text-soft">
          Cada versión se envía a Meta como una plantilla distinta (<span className="font-mono text-xs">{plantilla.clave}_v1</span>,{" "}
          <span className="font-mono text-xs">{plantilla.clave}_v2</span>…). Una plantilla aprobada no se edita: un cambio es una versión nueva.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!puedeEscribir && (
          <p className="text-xs text-text-soft">Solo el propietario del negocio puede publicar en Meta. Tú puedes ver el estado.</p>
        )}
        <ul className="flex flex-col gap-4">
          {plantilla.versiones.map((v) => {
            const ultimo = ultimos[v.version_n] ?? null;
            const estado = estadoDeVersion(v.meta, ultimo);
            const retirada = v.retirada_en !== null;
            const aviso = v.vigente && !retirada ? avisoDeDegradacion(estado) : null;
            const sePuedePublicar = puedeEscribir && !retirada && !estado.enMeta;
            const sePuedeReintentar = puedeEscribir && !retirada && estado.enMeta && estado.reintentable;
            // Un primer intento que falló sin dejar la plantilla reservada también se reintenta.
            const reintentar = sePuedeReintentar || (sePuedePublicar && !!ultimo && !ultimo.ok && ultimo.reintentable);
            return (
              <li key={v.version_n} className="flex flex-col gap-3 rounded-lg border border-border-soft p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-headline">Versión {v.version_n}</h3>
                  <span className="text-xs text-text-soft">{fecha(v.publicada_en)}</span>
                  {v.vigente && !retirada && <Badge variant="success">Vigente</Badge>}
                  {retirada && <Badge variant="neutral">Retirada</Badge>}
                  <span className="font-mono text-xs text-text-soft">{v.meta?.nombre ?? nombreEnMeta(plantilla.clave, v.version_n)}</span>
                </div>

                {retirada && !estado.enMeta ? (
                  <p className="text-sm text-text-soft">Esta versión está retirada y ya no se puede enviar a Meta. Publica una versión nueva.</p>
                ) : (
                  <EstadoDeMeta estado={estado} categoria={v.meta?.categoria} />
                )}

                {ultimo && !ultimo.ok && <p className="text-xs text-text-soft">{FALLO_NO_ROMPE_LA_VERSION}</p>}

                {aviso && (
                  <div role="note" className="flex items-start gap-2 rounded-md bg-status-info-bg p-3 text-xs text-status-info-fg">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <div>
                      <p className="font-medium">{aviso.titulo}</p>
                      <p className="mt-0.5">{aviso.texto}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {(sePuedePublicar || sePuedeReintentar) && (
                    <Button
                      type="button"
                      variant={reintentar ? "outline" : "accent"}
                      size="sm"
                      onClick={() => setAbierta({ version: v.version_n, reintento: reintentar })}
                    >
                      <CloudUpload className="h-4 w-4" aria-hidden />
                      {reintentar ? "Reintentar" : "Publicar en Meta"}
                      <span className="sr-only"> la versión {v.version_n}</span>
                    </Button>
                  )}
                  {estado.enMeta && (
                    <Link
                      href={enlacePlantillasMeta(conexiones)}
                      className="inline-flex items-center gap-1 text-xs text-link underline-offset-2 hover:underline"
                    >
                      Ver en las plantillas de Meta
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
      {abierta && (
        <PublicarEnMeta
          key={abierta.version}
          clave={plantilla.clave}
          version={abierta.version}
          definicion={plantilla.versiones.find((v) => v.version_n === abierta.version)?.vigente ? plantilla.definicion_vigente : null}
          conexiones={conexiones}
          reintento={abierta.reintento}
          onResultado={alResultado(abierta.version)}
          onCerrar={cerrar}
          onBanderaApagada={onBanderaApagada}
        />
      )}
    </Card>
  );
}
