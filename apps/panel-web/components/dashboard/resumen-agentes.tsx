import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Sparkline } from "@/components/dataviz";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/ui/kpi-tile";
import type { AgenteResumen, KpiResumen, ModuloResumen, ResumenPorAgente } from "@/lib/api/types";
import { tipoDeAgente } from "@/lib/agentes";
import { formatDateTime } from "@/lib/format";
import { propsDeKpi } from "@/lib/resumen/kpi";
import { agentesConTarjeta, cifrasDelTitulo, llevaInsignia, modulosSinAgente } from "@/lib/resumen/resumen-agente";

import { ActividadDeAgentes } from "./actividad-agentes";

/**
 * Resumen por agente (ADR-0171, SPEC-29): en secciones que se leen de arriba abajo. Primero el
 * negocio entero («Agente general»), después la evolución diaria y, al final, una tarjeta plegable
 * por agente con lo que gestiona. Cada cifra lleva a la pantalla que la explica.
 */

function Seccion({ id, titulo, apoyo, children }: { id: string; titulo: string; apoyo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div>
        <h2 id={id} className="font-display text-base font-semibold text-headline">
          {titulo}
        </h2>
        <p className="text-sm text-body">{apoyo}</p>
      </div>
      {children}
    </section>
  );
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
      <h3 className="text-sm font-medium text-headline">Módulo · {modulo.nombre}</h3>
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

/** El General: la cifra principal (conversaciones, con su tendencia) y las demás del negocio. */
function AgenteGeneral({ datos, dias }: { datos: ResumenPorAgente; dias: number }) {
  const { kpis, serie = [] } = datos.general;
  const principal = kpis.find((k) => k.id === "conversaciones");
  const resto = kpis.filter((k) => k !== principal);
  const sinAgente = modulosSinAgente(datos);
  const tendencia = serie.length > 1 ? serie.map((p) => p.conversaciones) : null;

  return (
    <Seccion id="resumen-general" titulo="Agente general" apoyo={`Todo el negocio, últimos ${dias} días.`}>
      {principal && (
        <KpiTile
          {...propsDeKpi(principal, dias)}
          size="hero"
          sparkline={
            tendencia ? (
              <Sparkline values={tendencia} height={56} area label={`Conversaciones por día, últimos ${dias} días`} />
            ) : undefined
          }
        />
      )}
      {resto.length > 0 && <Grilla kpis={resto} dias={dias} />}
      {sinAgente.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-body">Módulos que ningún agente gestiona todavía.</p>
          {sinAgente.map((m) => (
            <Modulo key={m.id} modulo={m} dias={dias} />
          ))}
        </div>
      )}
    </Seccion>
  );
}

function TarjetaDeAgente({ agente, dias, abierta }: { agente: AgenteResumen; dias: number; abierta: boolean }) {
  const cifras = cifrasDelTitulo(agente);
  return (
    <details open={abierta} className="group rounded-lg border border-border-soft bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-text-soft transition-transform group-open:rotate-90"
        />
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-sm font-semibold text-headline">{agente.name}</span>
          {llevaInsignia(agente) && <Badge>{tipoDeAgente(agente.kind)}</Badge>}
        </span>
        {/* Plegada, la tarjeta resume su módulo en dos cifras; abierta, ya están en el cuerpo. */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm group-open:hidden">
          {cifras.map((c) => (
            <li key={c.id} className="whitespace-nowrap text-body">
              {c.label} <span className="font-medium tabular-nums text-headline">{c.valor}</span>
            </li>
          ))}
        </ul>
        <span className="ml-auto text-xs text-text-soft">
          {agente.ultima_actividad
            ? `Última actividad ${formatDateTime(agente.ultima_actividad)}`
            : "Sin actividad en el período"}
        </span>
      </summary>
      <div className="flex flex-col gap-6 border-t border-border-soft px-5 py-5">
        {/* Fuera del `<summary>`: un enlace dentro de un control que pliega no es accesible. */}
        <Link
          href={`/agentes/${encodeURIComponent(agente.ref)}`}
          aria-label={`Ver el agente ${agente.name}`}
          className="self-start text-sm text-link hover:underline"
        >
          Ver agente
        </Link>
        {agente.kpis.length > 0 && <Grilla kpis={agente.kpis} dias={dias} />}
        {agente.modulos.map((m) => (
          <Modulo key={m.id} modulo={m} dias={dias} />
        ))}
      </div>
    </details>
  );
}

/**
 * `despuesDelGeneral`: lo que se intercala entre «Agente general» y lo demás (los primeros pasos
 * del negocio): el Resumen abre con las cifras del negocio y no queda debajo de las bienvenidas.
 */
export function ResumenAgentes({ datos, despuesDelGeneral }: { datos: ResumenPorAgente; despuesDelGeneral?: ReactNode }) {
  const dias = datos.periodo.dias ?? 7;
  const conSerie = datos.agentes.some((a) => (a.serie?.length ?? 0) > 0);
  const agentes = agentesConTarjeta(datos);

  return (
    <div className="flex flex-col gap-8">
      {(datos.general.kpis.length > 0 || modulosSinAgente(datos).length > 0) && (
        <AgenteGeneral datos={datos} dias={dias} />
      )}
      {despuesDelGeneral}
      {conSerie && <ActividadDeAgentes datos={datos} />}
      {agentes.length > 0 && (
        <Seccion
          id="resumen-agentes"
          titulo="Agentes"
          apoyo="Cada agente con lo que gestiona; abre una tarjeta para ver el detalle de cada cifra."
        >
          <div className="flex flex-col gap-3">
            {agentes.map((a, i) => (
              <TarjetaDeAgente key={a.ref} agente={a} dias={dias} abierta={i === 0} />
            ))}
          </div>
        </Seccion>
      )}
    </div>
  );
}
