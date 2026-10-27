import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiTile } from "@/components/ui/kpi-tile";
import type { AgenteResumen, KpiResumen, ModuloResumen, ResumenPorAgente } from "@/lib/api/types";
import { tipoDeAgente } from "@/lib/agentes";
import { propsDeKpi } from "@/lib/resumen/kpi";

/**
 * Resumen por agente (ADR-0171): primero el negocio entero (lo que gobierna el Coordinador) y
 * luego una tarjeta por agente con su actividad y, debajo, los módulos que gestiona. Cada cifra
 * lleva a la pantalla que la explica.
 */

function Grilla({ kpis }: { kpis: KpiResumen[] }) {
  // Cinco tarjetas en una sola fila (no cuatro y una huérfana).
  const columnas = kpis.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4";
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${columnas}`}>
      {kpis.map((k) => (
        <KpiTile key={k.id} {...propsDeKpi(k)} />
      ))}
    </div>
  );
}

function Modulo({ modulo }: { modulo: ModuloResumen }) {
  return (
    <section aria-label={`Módulo ${modulo.nombre}`} className="flex flex-col gap-3">
      <h4 className="text-sm font-medium text-headline">Módulo · {modulo.nombre}</h4>
      {modulo.error ? (
        <p role="alert" className="text-sm text-status-danger-fg">
          {modulo.error}
        </p>
      ) : (
        <Grilla kpis={modulo.kpis} />
      )}
    </section>
  );
}

function TarjetaDeAgente({ agente }: { agente: AgenteResumen }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>
            <Link href={`/agentes/${encodeURIComponent(agente.ref)}`} className="text-link hover:underline">
              {agente.name}
            </Link>
          </CardTitle>
          <CardDescription>Últimos 7 días</CardDescription>
        </div>
        <Badge>{tipoDeAgente(agente.kind)}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {agente.kpis.length > 0 && <Grilla kpis={agente.kpis} />}
        {agente.modulos.map((m) => (
          <Modulo key={m.id} modulo={m} />
        ))}
      </CardContent>
    </Card>
  );
}

export function ResumenAgentes({ datos }: { datos: ResumenPorAgente }) {
  const agentes = datos.agentes.filter((a) => a.kpis.length > 0 || a.modulos.length > 0);
  return (
    <div className="flex flex-col gap-6">
      {datos.general.kpis.length > 0 && (
        <section aria-labelledby="resumen-general" className="flex flex-col gap-3">
          <div>
            <h2 id="resumen-general" className="font-display text-base font-semibold text-headline">
              Agente general
            </h2>
            <p className="text-sm text-body">Todo el negocio, últimos 7 días.</p>
          </div>
          <Grilla kpis={datos.general.kpis} />
        </section>
      )}
      {agentes.length > 0 && (
        <section aria-labelledby="resumen-agentes" className="flex flex-col gap-3">
          <h2 id="resumen-agentes" className="font-display text-base font-semibold text-headline">
            Agentes
          </h2>
          <div className="flex flex-col gap-4">
            {agentes.map((a) => (
              <TarjetaDeAgente key={a.ref} agente={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
