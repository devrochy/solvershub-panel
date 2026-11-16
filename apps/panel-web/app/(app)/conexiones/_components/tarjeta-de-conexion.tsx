import type { ReactNode } from "react";
import Link from "next/link";

import { ChannelIcon } from "@/components/domain/channel-icon";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { estadoDeConexion, iconoDeConexion, rutaDeFicha, subtituloDeFicha, tipoDeFicha } from "@/lib/conexion-ficha";
import { actividadDeLaSemana, agentesDeLaConexion, type ConexionConsola } from "@/lib/conexiones";

/**
 * Una conexión en la cuadrícula (CON-21): el mismo estado, quién atiende y lo de la semana que la
 * tabla. La tarjeta abre su ficha; la acción (Pausar) va por encima del enlace.
 */
export function TarjetaDeConexion({ conexion, accion }: { conexion: ConexionConsola; accion?: ReactNode }) {
  const estado = estadoDeConexion(conexion);
  return (
    <Card className="relative flex w-full flex-col gap-3 p-5 transition-colors duration-150 hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ChannelIcon id={iconoDeConexion(conexion)} />
          <div className="flex min-w-0 flex-col">
            <Link
              href={rutaDeFicha(conexion)}
              className="truncate font-display text-sh-block text-headline outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-focus"
            >
              {conexion.label}
            </Link>
            <span className="truncate text-xs text-text-soft">{subtituloDeFicha(conexion, tipoDeFicha(conexion))}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={estado.tono}>{estado.label}</Badge>
          {accion && <div className="relative z-10">{accion}</div>}
        </div>
      </div>

      <p className="text-sm text-body">
        {conexion.conversational ? (
          <>
            <span className="text-text-soft">Atienden: </span>
            {agentesDeLaConexion(conexion)}
          </>
        ) : (
          <span className="text-text-soft">Integración del negocio</span>
        )}
      </p>

      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border-soft pt-3">
        <span className="text-sh-caption text-text-soft">Últimos 7 días</span>
        <span className="whitespace-nowrap text-sm tabular-nums text-headline">
          {conexion.conversational ? actividadDeLaSemana(conexion.usage_7d) : "—"}
        </span>
      </div>
    </Card>
  );
}
