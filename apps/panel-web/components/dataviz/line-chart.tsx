"use client";

import type { PointerEvent } from "react";

import {
  dominioY,
  escalaX,
  escalaY,
  indiceCercano,
  indicesDeEtiquetas,
  pathArea,
  pathLinea,
  ticksY,
} from "@/components/dataviz/escalas";
import {
  anchoDeTexto,
  columnasDeTabla,
  EjeX,
  EjeY,
  Leyenda,
  MarcoDelGrafico,
  prepararGrafico,
  textoDeValor,
  TooltipDelGrafico,
  useAncho,
  useCursor,
  xDelPuntero,
} from "@/components/dataviz/internos";
import type { ChartProps } from "@/components/dataviz/tipos";

export type LineChartProps = ChartProps & {
  /** Agrega el área bajo cada línea (lavado del color de la serie al 10 %). */
  area?: boolean;
};

const MARGEN_SUPERIOR = 12;
const BANDA_EJE_X = 28;

/**
 * Línea (con área opcional) para tendencias en el tiempo (HU-DS-06). Varias series con
 * colores de orden fijo por entidad, un solo eje Y, leyenda desde 2 series y el valor final
 * rotulado cuando hay una sola. Crosshair con tooltip al pasar el puntero o con ← → (se
 * anuncia) y «Ver tabla» con los mismos datos. Sin animación de entrada.
 */
export function LineChart(props: LineChartProps) {
  const { title, height = 240, yDomain, area = false, xHeader = "Fecha", emptyMessage = "Sin datos para este período.", className } = props;
  const { declaradas, datos, visibles, xFormat, formatoTick, formatoValor } = prepararGrafico(props);
  const [refAncho, ancho] = useAncho<HTMLDivElement>(640);
  const n = datos.length;
  const { activo, setActivo, alTeclado } = useCursor(n);

  const valoresVisibles = datos.flatMap((d) => visibles.map((s) => d.values[s.key]));
  const dominio = yDomain ?? dominioY(valoresVisibles);
  const ticks = ticksY(dominio);

  // Etiqueta directa selectiva: con una sola serie visible, su último valor al final de la línea.
  const unica = visibles.length === 1 ? visibles[0] : null;
  let ultimo = -1;
  if (unica) for (let i = n - 1; i >= 0 && ultimo < 0; i--) if (typeof datos[i].values[unica.key] === "number") ultimo = i;
  const textoFinal = unica && ultimo >= 0 ? formatoTick(datos[ultimo].values[unica.key] as number) : "";

  const izquierda = Math.max(...ticks.map((t) => anchoDeTexto(formatoTick(t))), 16) + 12;
  const ultimaEtiqueta = n ? xFormat(datos[n - 1].x) : "";
  const derecha = ancho - Math.max(12, anchoDeTexto(ultimaEtiqueta) / 2 + 2, textoFinal ? anchoDeTexto(textoFinal) + 14 : 0);
  const abajo = height - BANDA_EJE_X;

  const x = escalaX(n, [izquierda, derecha]);
  const y = escalaY(dominio, [abajo, MARGEN_SUPERIOR]);
  const base = y(Math.max(dominio[0], Math.min(0, dominio[1])));
  const anchoEtiqueta = Math.max(0, ...datos.map((d) => anchoDeTexto(xFormat(d.x)))) + 16;
  const maxEtiquetas = Math.max(2, Math.floor((derecha - izquierda) / anchoEtiqueta));
  const etiquetas = indicesDeEtiquetas(n, maxEtiquetas).map((i) => ({ key: i, x: x(i), texto: xFormat(datos[i].x) }));

  const filasActivas =
    activo === null
      ? []
      : visibles.map((s) => ({
          key: s.key,
          label: s.label,
          valor: textoDeValor(datos[activo].values[s.key], formatoValor),
          clases: s.clases,
        }));
  const anuncio =
    activo === null ? "" : `${xFormat(datos[activo].x)}: ${filasActivas.map((f) => `${f.label} ${f.valor}`).join(", ")}`;

  function alMover(e: PointerEvent<SVGSVGElement>) {
    setActivo(indiceCercano(xDelPuntero(e, ancho), n, x));
  }

  return (
    <MarcoDelGrafico
      title={title}
      className={className}
      refAncho={refAncho}
      vacio={n === 0 || visibles.length === 0}
      emptyMessage={emptyMessage}
      anuncio={anuncio}
      alTeclado={alTeclado}
      alSalir={() => setActivo(null)}
      columnas={columnasDeTabla(visibles, xHeader, xFormat, formatoValor)}
      datos={datos}
      leyenda={declaradas.length >= 2 ? <Leyenda items={visibles} marca="linea" /> : undefined}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${ancho} ${height}`}
        aria-hidden="true"
        focusable="false"
        className="block touch-pan-y overflow-visible"
        onPointerMove={alMover}
        onPointerDown={alMover}
        onPointerLeave={() => setActivo(null)}
      >
        <EjeY ticks={ticks} y={y} izquierda={izquierda} derecha={derecha} formato={formatoTick} />
        <EjeX etiquetas={etiquetas} y={height - 8} />

        {visibles.map((s) => {
          const valores = datos.map((d) => d.values[s.key]);
          return (
            <g key={s.key} data-serie={s.key}>
              {area && <path d={pathArea(valores, x, y, base)} className={s.clases.relleno} fillOpacity={0.1} />}
              <path
                d={pathLinea(valores, x, y)}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={s.clases.trazo}
              />
            </g>
          );
        })}

        {unica && ultimo >= 0 && activo === null && (
          <g>
            <circle
              cx={x(ultimo)}
              cy={y(datos[ultimo].values[unica.key] as number)}
              r={4}
              strokeWidth={2}
              className={`${unica.clases.relleno} stroke-surface`}
            />
            <text
              x={x(ultimo) + 10}
              y={y(datos[ultimo].values[unica.key] as number)}
              dominantBaseline="middle"
              className="fill-headline text-sh-caption font-medium tabular-nums"
            >
              {textoFinal}
            </text>
          </g>
        )}

        {activo !== null && (
          <g data-crosshair={activo}>
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={MARGEN_SUPERIOR}
              y2={abajo}
              strokeWidth={1}
              shapeRendering="crispEdges"
              className="stroke-data-axis"
            />
            {visibles.map((s) => {
              const v = datos[activo].values[s.key];
              return typeof v === "number" && Number.isFinite(v) ? (
                <circle
                  key={s.key}
                  cx={x(activo)}
                  cy={y(v)}
                  r={4}
                  strokeWidth={2}
                  className={`${s.clases.relleno} stroke-surface`}
                />
              ) : null;
            })}
          </g>
        )}
      </svg>
      {activo !== null && (
        <TooltipDelGrafico x={x(activo)} ancho={ancho} titulo={xFormat(datos[activo].x)} filas={filasActivas} />
      )}
    </MarcoDelGrafico>
  );
}
