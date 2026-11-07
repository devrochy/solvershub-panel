import { KpiTile } from "@/components/ui/kpi-tile";
import { formatNumber, formatUsd } from "@/lib/format";

/** Un indicador: su valor, o por qué no hay (sin permiso no se muestra; sin datos, se dice). */
export type Indicador<T> = { valor: T } | { error: string } | null;

/**
 * Indicadores de la cabecera de la ficha del agente (HU-UX-09), siempre de los últimos 7 días:
 * conversaciones, % resueltas sin pasar a una persona y consumo. Un indicador `null` no se
 * muestra (p. ej. el costo para quien no ve costos: entonces el consumo va en respuestas).
 */
export function IndicadoresDelAgente({
  conversaciones,
  resueltas,
  consumo,
}: {
  conversaciones: Indicador<number>;
  resueltas: Indicador<{ porcentaje: number | null; turnos: number }>;
  consumo: Indicador<{ costoUsd: number | null; turnos: number }>;
}) {
  const tiles = [
    conversaciones && (
      <KpiTile
        key="conversaciones"
        label="Conversaciones · 7 días"
        {...("error" in conversaciones ? { error: conversaciones.error } : { value: formatNumber(conversaciones.valor) })}
      />
    ),
    resueltas && (
      <KpiTile
        key="resueltas"
        label="Resueltas sin una persona · 7 días"
        {...("error" in resueltas
          ? { error: resueltas.error }
          : resueltas.valor.porcentaje === null
            ? {
                value: "—",
                hint:
                  resueltas.valor.turnos === 0
                    ? "Aún no hay respuestas en estos 7 días."
                    : `Muestra pequeña: ${formatNumber(resueltas.valor.turnos)} respuestas.`,
              }
            : {
                value: `${resueltas.valor.porcentaje.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`,
                hint: `De ${formatNumber(resueltas.valor.turnos)} respuestas.`,
              })}
      />
    ),
    consumo && (
      <KpiTile
        key="consumo"
        label="Consumo · 7 días"
        {...("error" in consumo
          ? { error: consumo.error }
          : consumo.valor.costoUsd === null
            ? { value: formatNumber(consumo.valor.turnos), hint: "Respuestas del agente." }
            : { value: formatUsd(consumo.valor.costoUsd, 2), hint: `${formatNumber(consumo.valor.turnos)} respuestas.` })}
      />
    ),
  ].filter(Boolean);
  if (tiles.length === 0) return null;
  return (
    <section aria-label="Indicadores de los últimos 7 días" className="grid gap-3 sm:grid-cols-3">
      {tiles}
    </section>
  );
}
