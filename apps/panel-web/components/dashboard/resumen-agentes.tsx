import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiTile } from "@/components/ui/kpi-tile";
import type { AgenteResumen, KpiResumen, ModuloResumen, ResumenPorAgente } from "@/lib/api/types";
import { tipoDeAgente } from "@/lib/agentes";
import { propsDeKpi } from "@/lib/resumen/kpi";

import { ActividadDeAgentes } from "./actividad-agentes";

/**
 * Resumen por agente (ADR-0171): primero el negocio entero (lo que gobierna el Coordinador),
 * después la actividad diaria de los agentes en el tiempo y, al final, los módulos que gestiona
 * cada uno. Cada cifra lleva a la pantalla que la explica.
 */

/** KPIs de actividad que ya resume la tabla del período; en la tarjeta se evita repetirlos. */
const EN_LA_TABLA = new Set(["turnos", "conversaciones", "costo"]);

function kpisDeTarjeta(kpis: KpiResumen[], conSerie: boolean): KpiResumen[] {
  return conSerie ? kpis.filter((k) => !EN_LA_TABLA.has(k.id)) : kpis;
}

function Grilla({ kpis, dias }: { kpis: KpiResumen[]; dias: number }) {
  // Cinco tarjetas en una sola fila (no cuatro y una huérfana).
  const columnas = kpis.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4";
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${columnas}`}>
      {kpis.map((k) => (
        <KpiTile key={k.id} {...propsDeKpi(k, dias)} />
      ))}
    </div>
  );
}

function Modulo({ modulo, dias }: { modulo: ModuloResumen; dias: number }) {
  return (
    <section aria-label={`Módulo ${modulo.nombre}`} className="flex flex-col gap-3">
      <h4 className="text-sm font-medium text-headline">Módulo · {modulo.nombre}</h4>
      {modulo.error ? (
        <p role="alert" className="text-sm text-status-danger-fg">
          {modulo.error}
        </p>
      ) : (
        <Grilla kpis={modulo.kpis} dias={dias} />
      )}
    </section>
  );
}

function TarjetaDeAgente({ agente, dias, conSerie }: { agente: AgenteResumen; dias: number; conSerie: boolean }) {
  const kpis = kpisDeTarjeta(agente.kpis, conSerie);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>
            <Link href={`/agentes/${encodeURIComponent(agente.ref)}`} className="text-link hover:underline">
              {agente.name}
            </Link>
          </CardTitle>
          <CardDescription>Últimos {dias} días</CardDescription>
        </div>
        <Badge>{tipoDeAgente(agente.kind)}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {kpis.length > 0 && <Grilla kpis={kpis} dias={dias} />}
        {agente.modulos.map((m) => (
          <Modulo key={m.id} modulo={m} dias={dias} />
        ))}
      </CardContent>
    </Card>
  );
}

export function ResumenAgentes({ datos }: { datos: ResumenPorAgente }) {
  const dias = datos.periodo.dias ?? 7;
  const conSerie = datos.agentes.some((a) => (a.serie?.length ?? 0) > 0);
  // El General ya vive en la tabla de actividad; en las tarjetas solo van los especialistas
  // con algo propio que contar (operación o módulos).
  const agentes = datos.agentes.filter(
    (a) =>
      a.key !== "general" &&
      (kpisDeTarjeta(a.kpis, conSerie).length > 0 || a.modulos.length > 0),
  );

  return (
    <div className="flex flex-col gap-6">
      {datos.general.kpis.length > 0 && (
        <section aria-labelledby="resumen-general" className="flex flex-col gap-3">
          <div>
            <h2 id="resumen-general" className="font-display text-base font-semibold text-headline">
              Negocio
            </h2>
            <p className="text-sm text-body">Todo el negocio, últimos {dias} días.</p>
          </div>
          <Grilla kpis={datos.general.kpis} dias={dias} />
        </section>
      )}
      {conSerie && <ActividadDeAgentes datos={datos} />}
      {agentes.length > 0 && (
        <section aria-labelledby="resumen-agentes" className="flex flex-col gap-3">
          <div>
            <h2 id="resumen-agentes" className="font-display text-base font-semibold text-headline">
              Módulos por agente
            </h2>
            <p className="text-sm text-body">
              Lo que gestiona cada agente, con enlace al detalle de cada cifra.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {agentes.map((a) => (
              <TarjetaDeAgente key={a.ref} agente={a} dias={dias} conSerie={conSerie} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
