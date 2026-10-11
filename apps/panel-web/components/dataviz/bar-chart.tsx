"use client";

import { dominioY, escalaBandas, escalaY, indicesDeEtiquetas, pathBarra, ticksY } from "@/components/dataviz/escalas";
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
} from "@/components/dataviz/internos";
import type { ChartProps } from "@/components/dataviz/tipos";

export type BarChartProps = ChartProps;

const MARGEN_SUPERIOR = 12;
const BANDA_EJE_X = 28;
/** Grosor máximo de una barra: nunca llena la banda, el resto es aire. */
const ANCHO_MAXIMO = 24;
/** Separación entre barras de un mismo grupo, en el color de la superficie. */
const SEPARACION = 2;
/** Área mínima que responde al puntero alrededor de una barra. */
const OBJETIVO_MINIMO = 24;

/**
 * Barras verticales de una serie o agrupadas (HU-DS-06). Barras de 24 px como máximo,
 * extremo redondeado de 4 px y base recta, 2 px de aire entre las de un grupo, un solo eje
 * Y que parte de cero. Cada barra es su propio objetivo (puntero o ← → con el foco) con
 * tooltip, y «Ver tabla» muestra los mismos datos.
 */
export function BarChart(props: BarChartProps) {
  const { title, height = 240, yDomain, xHeader = "Categoría", emptyMessage = "Sin datos para este período.", className } = props;
  const { declaradas, datos, visibles, xFormat, formatoTick, formatoValor } = prepararGrafico(props);
  const [refAncho, ancho] = useAncho<HTMLDivElement>(640);
  const n = datos.length;
  const m = visibles.length;
  const { activo, setActivo, alTeclado } = useCursor(n * m);

  const dominio = yDomain ?? dominioY(datos.flatMap((d) => visibles.map((s) => d.values[s.key])));
  const ticks = ticksY(dominio);
  const izquierda = Math.max(...ticks.map((t) => anchoDeTexto(formatoTick(t))), 16) + 12;
  const derecha = ancho - 12;
  const abajo = height - BANDA_EJE_X;

  const bandas = escalaBandas(n, [izquierda, derecha]);
  const y = escalaY(dominio, [abajo, MARGEN_SUPERIOR]);
  const base = y(Math.max(dominio[0], Math.min(0, dominio[1])));
  const anchoBarra = m ? Math.max(1, Math.min(ANCHO_MAXIMO, (bandas.bandwidth() - SEPARACION * (m - 1)) / m)) : 0;
  const anchoGrupo = m * anchoBarra + SEPARACION * Math.max(0, m - 1);
  const objetivo = Math.min(bandas.step() / Math.max(m, 1), Math.max(OBJETIVO_MINIMO, anchoBarra + SEPARACION));

  const barras = datos.flatMap((d, i) => {
    const inicio = (bandas(String(i)) ?? 0) + (bandas.bandwidth() - anchoGrupo) / 2;
    return visibles.map((s, j) => {
      const v = d.values[s.key];
      const xBarra = inicio + j * (anchoBarra + SEPARACION);
      return {
        indice: i * m + j,
        fila: d,
        serie: s,
        v,
        x: xBarra,
        centro: xBarra + anchoBarra / 2,
        d: typeof v === "number" && Number.isFinite(v) ? pathBarra({ x: xBarra, ancho: anchoBarra, base, tope: y(v) }) : "",
      };
    });
  });

  // Todas las categorías llevan etiqueta si caben; si no, se reparten con paso fijo.
  const anchoEtiqueta = Math.max(0, ...datos.map((d) => anchoDeTexto(xFormat(d.x)))) + 8;
  const maxEtiquetas = Math.max(2, Math.floor((derecha - izquierda) / anchoEtiqueta));
  const etiquetas = indicesDeEtiquetas(n, maxEtiquetas).map((i) => ({
    key: i,
    x: (bandas(String(i)) ?? 0) + bandas.bandwidth() / 2,
    texto: xFormat(datos[i].x),
  }));

  const barraActiva = activo === null ? null : barras[activo];
  const filaActiva = barraActiva
    ? [
        {
          key: barraActiva.serie.key,
          label: barraActiva.serie.label,
          valor: textoDeValor(barraActiva.v, formatoValor),
          clases: barraActiva.serie.clases,
        },
      ]
    : [];
  const anuncio = barraActiva
    ? `${xFormat(barraActiva.fila.x)}: ${barraActiva.serie.label} ${textoDeValor(barraActiva.v, formatoValor)}`
    : "";

  return (
    <MarcoDelGrafico
      title={title}
      className={className}
      refAncho={refAncho}
      vacio={n === 0 || m === 0}
      emptyMessage={emptyMessage}
      anuncio={anuncio}
      alTeclado={alTeclado}
      alSalir={() => setActivo(null)}
      columnas={columnasDeTabla(visibles, xHeader, xFormat, formatoValor)}
      datos={datos}
      leyenda={declaradas.length >= 2 ? <Leyenda items={visibles} marca="barra" /> : undefined}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${ancho} ${height}`}
        aria-hidden="true"
        focusable="false"
        className="block overflow-visible"
        onPointerLeave={() => setActivo(null)}
      >
        <EjeY ticks={ticks} y={y} izquierda={izquierda} derecha={derecha} formato={formatoTick} />
        <EjeX etiquetas={etiquetas} y={height - 8} />

        {barras.map((b) => (
          <path
            key={b.indice}
            d={b.d}
            data-serie={b.serie.key}
            className={b.serie.clases.relleno}
            opacity={activo !== null && activo !== b.indice ? 0.6 : 1}
          />
        ))}

        {/* Objetivos del puntero: más anchos que la barra y de toda la altura del área. */}
        {barras.map((b) => (
          <rect
            key={`objetivo-${b.indice}`}
            x={b.centro - objetivo / 2}
            y={MARGEN_SUPERIOR}
            width={objetivo}
            height={abajo - MARGEN_SUPERIOR}
            fill="transparent"
            onPointerEnter={() => setActivo(b.indice)}
            onPointerDown={() => setActivo(b.indice)}
          />
        ))}
      </svg>
      {barraActiva && (
        <TooltipDelGrafico
          x={barraActiva.centro}
          ancho={ancho}
          titulo={xFormat(barraActiva.fila.x)}
          filas={filaActiva}
        />
      )}
    </MarcoDelGrafico>
  );
}
