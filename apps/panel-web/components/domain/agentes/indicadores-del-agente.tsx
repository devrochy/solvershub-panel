import { creditos } from "@/lib/consumo";
import { formatNumber, formatUsd } from "@/lib/format";

/** Un indicador: su valor, o por qué no hay (sin permiso no se muestra; sin datos, se dice). */
export type Indicador<T> = { valor: T } | { error: string } | null;

function porcentaje(n: number): string {
  return `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;
}

/**
 * Indicadores de la cabecera de la ficha (HU-UX-09, AGT-03), en una frase: «48 conversaciones esta
 * semana · 95 % sin pasar a una persona · 3.200 créditos este mes». Un indicador `null` no se muestra
 * (sin permiso); uno que falla o no tiene muestra se omite de la frase sin tumbar los demás. Los
 * dólares van solo para el master.
 */
export function IndicadoresDelAgente({
  conversaciones,
  resueltas,
  creditosDelMes,
  costoUsd = null,
}: {
  conversaciones: Indicador<number>;
  resueltas: Indicador<{ porcentaje: number | null; turnos: number }>;
  /** Créditos del plan que usó este mes; `null` si el plan no los mide. */
  creditosDelMes: Indicador<number>;
  /** Solo para el master: costo de proveedor de los últimos 7 días. */
  costoUsd?: Indicador<number | null>;
}) {
  const partes: React.ReactNode[] = [];
  if (conversaciones && "valor" in conversaciones) {
    const n = conversaciones.valor;
    partes.push(
      <span key="conversaciones">
        <b className="font-semibold text-headline">{`${formatNumber(n)} ${n === 1 ? "conversación" : "conversaciones"}`}</b> esta semana
      </span>,
    );
  }
  if (resueltas && "valor" in resueltas && resueltas.valor.porcentaje !== null) {
    partes.push(
      <span key="resueltas">
        <b className="font-semibold text-headline">{porcentaje(resueltas.valor.porcentaje)}</b> sin pasar a una persona
      </span>,
    );
  }
  if (creditosDelMes && "valor" in creditosDelMes) {
    partes.push(
      <span key="creditos">
        <b className="font-semibold text-headline">{creditos(creditosDelMes.valor)}</b> este mes
      </span>,
    );
  }
  if (costoUsd && "valor" in costoUsd && costoUsd.valor !== null) {
    partes.push(<span key="costo">{`${formatUsd(costoUsd.valor, 2)} de proveedor esta semana`}</span>);
  }
  const algunoFallo = [conversaciones, resueltas, creditosDelMes].some((i) => i && "error" in i);
  if (partes.length === 0) {
    if (!algunoFallo) return null;
    return <p className="text-sm text-text-soft">Todavía no hay cifras de esta semana.</p>;
  }
  return (
    <p className="text-sm text-body tabular-nums">
      {partes.map((parte, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden> · </span>}
          {parte}
        </span>
      ))}
    </p>
  );
}
