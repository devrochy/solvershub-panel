"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Table2 } from "lucide-react";

import { clasesDeSerie, type ClasesDeSerie } from "@/components/dataviz/colores";
import {
  agruparEnOtros,
  CLAVE_OTROS,
  fechaCorta,
  formateadorY,
  MAX_SERIES,
  type SerieBase,
} from "@/components/dataviz/escalas";
import type { ChartDatum, ChartProps } from "@/components/dataviz/tipos";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

/**
 * Piezas compartidas de los gráficos (HU-DS-06): ancho medido, cursor con teclado, leyenda,
 * tooltip, ejes y el marco con «Ver tabla». No se exportan desde `index.ts`.
 */

export type SerieVisible = SerieBase & { clases: ClasesDeSerie };

/**
 * Lo que comparten `LineChart` y `BarChart` antes de dibujar: agrupa en «Otros» desde la
 * 5.ª serie, asigna el color por la lista declarada y recién después filtra las visibles.
 */
export function prepararGrafico({ series, data, visibleKeys, xFormat, yFormat }: ChartProps) {
  const agrupado = agruparEnOtros(series, data);
  const declaradas = agrupado.series;
  // Si se filtró alguna de las agrupadas, «Otros» sigue visible mientras quede alguna de ellas.
  const visibles = new Set(visibleKeys ?? declaradas.map((s) => s.key));
  const agrupadas = series.slice(MAX_SERIES).map((s) => s.key);
  const otrosVisible = visibles.has(CLAVE_OTROS) || agrupadas.some((k) => visibles.has(k));
  const visiblesOrdenadas: SerieVisible[] = declaradas
    .filter((s) => (s.key === CLAVE_OTROS ? otrosVisible : visibles.has(s.key)))
    .map((s) => ({ ...s, clases: clasesDeSerie(s.key, declaradas) }));
  return {
    declaradas,
    datos: agrupado.datos as ChartDatum[],
    visibles: visiblesOrdenadas,
    xFormat: xFormat ?? fechaCorta,
    formatoTick: formateadorY(yFormat, { compacto: true }),
    formatoValor: formateadorY(yFormat),
  };
}

/** Ancho del contenedor (ResizeObserver). Sin él (SSR, jsdom) se queda en `inicial`. */
export function useAncho<T extends Element>(inicial: number): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(([entrada]) => {
      const w = Math.round(entrada.contentRect.width);
      if (w > 0) setAncho(w);
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  return [ref, ancho];
}

/**
 * Posición activa del crosshair (o de la barra): la mueven el puntero y, con el foco en el
 * gráfico, ← → (Inicio y Fin van a los extremos, Escape lo quita).
 */
export function useCursor(n: number) {
  const [activo, setActivo] = useState<number | null>(null);
  const actual = activo !== null && activo < n ? activo : null;

  function alTeclado(e: KeyboardEvent) {
    if (n === 0) return;
    let siguiente: number;
    switch (e.key) {
      case "ArrowRight":
        siguiente = actual === null ? 0 : Math.min(n - 1, actual + 1);
        break;
      case "ArrowLeft":
        siguiente = actual === null ? n - 1 : Math.max(0, actual - 1);
        break;
      case "Home":
        siguiente = 0;
        break;
      case "End":
        siguiente = n - 1;
        break;
      case "Escape":
        setActivo(null);
        return;
      default:
        return;
    }
    e.preventDefault();
    setActivo(siguiente);
  }

  return { activo: actual, setActivo, alTeclado };
}

/** Convierte la X del puntero a coordenadas del viewBox (el SVG puede estar escalado). */
export function xDelPuntero(e: { clientX: number; currentTarget: Element }, ancho: number): number {
  const caja = e.currentTarget.getBoundingClientRect();
  if (caja.width === 0) return e.clientX - caja.left;
  return ((e.clientX - caja.left) * ancho) / caja.width;
}

/** Ancho aproximado de un texto de 12 px (Inter), para reservar márgenes sin medir el DOM. */
export function anchoDeTexto(texto: string): number {
  return Math.ceil(texto.length * 7);
}

export type ItemDeLeyenda = { key: string; label: string; clases: ClasesDeSerie };

/**
 * Leyenda (con 2 o más series). La muestra imita la marca: trazo para líneas, cuadro
 * para barras. El texto va en tokens de texto, nunca en el color de la serie.
 */
export function Leyenda({ items, marca }: { items: readonly ItemDeLeyenda[]; marca: "linea" | "barra" }) {
  return (
    <ul aria-label="Series" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sh-caption text-body">
      {items.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5">
          <MuestraDeSerie clases={item.clases} marca={marca} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function MuestraDeSerie({ clases, marca }: { clases: ClasesDeSerie; marca: "linea" | "barra" }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0", clases.fondo, marca === "linea" ? "h-0.5 w-3 rounded-pill" : "h-2.5 w-2.5 rounded-[3px]")}
    />
  );
}

export type FilaDeTooltip = { key: string; label: string; valor: string; clases: ClasesDeSerie };

/**
 * Tooltip del gráfico: el valor manda (fuerte) y la serie lo acompaña (secundaria), con una
 * clave de trazo corto (también en barras: a esta densidad un cuadro es tinta de más). Se ubica en % del ancho para no depender de la escala del SVG y no
 * captura el puntero. Solo complementa: los mismos datos están en la tabla.
 */
export function TooltipDelGrafico({
  x,
  ancho,
  titulo,
  filas,
}: {
  x: number;
  ancho: number;
  titulo: string;
  filas: readonly FilaDeTooltip[];
}) {
  const fraccion = ancho > 0 ? x / ancho : 0.5;
  const desplazamiento = fraccion > 0.7 ? "calc(-100% - 12px)" : fraccion < 0.3 ? "12px" : "-50%";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1 z-10 min-w-32 rounded-md border border-border-soft bg-surface-raised px-3 py-2 text-sh-caption shadow-elev-2"
      style={{ left: `${fraccion * 100}%`, transform: `translateX(${desplazamiento})` }}
    >
      <p className="text-text-soft">{titulo}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {filas.map((f) => (
          <li key={f.key} className="flex items-center gap-2 whitespace-nowrap">
            <MuestraDeSerie clases={f.clases} marca="linea" />
            <span className="font-semibold text-headline tabular-nums">{f.valor}</span>
            <span className="text-body">{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Grilla horizontal y ticks del único eje Y: líneas finas, sólidas y recesivas. */
export function EjeY({
  ticks,
  y,
  izquierda,
  derecha,
  formato,
}: {
  ticks: readonly number[];
  y: (v: number) => number;
  izquierda: number;
  derecha: number;
  formato: (v: number) => string;
}) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={izquierda}
            x2={derecha}
            y1={y(t)}
            y2={y(t)}
            strokeWidth={1}
            shapeRendering="crispEdges"
            className={t === 0 ? "stroke-data-axis" : "stroke-data-grid"}
          />
          <text
            x={izquierda - 8}
            y={y(t)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-text-soft text-sh-caption tabular-nums"
          >
            {formato(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Etiquetas del eje X (sin línea propia: la base es el tick del cero). */
export function EjeX({
  etiquetas,
  y,
}: {
  etiquetas: readonly { key: string | number; x: number; texto: string }[];
  y: number;
}) {
  return (
    <g>
      {etiquetas.map((e) => (
        <text key={e.key} x={e.x} y={y} textAnchor="middle" className="fill-text-soft text-sh-caption">
          {e.texto}
        </text>
      ))}
    </g>
  );
}

/** Columnas de la tabla alternativa: la categoría y una columna por serie visible. */
export function columnasDeTabla(
  series: readonly { key: string; label: string }[],
  xHeader: string,
  xFormat: (x: string) => string,
  formato: (v: number) => string,
): Column<ChartDatum>[] {
  return [
    { key: "__x", header: xHeader, cell: (d) => xFormat(d.x) },
    ...series.map((s) => ({
      key: s.key,
      header: s.label,
      align: "right" as const,
      cell: (d: ChartDatum) => textoDeValor(d.values[s.key], formato),
    })),
  ];
}

/** Valor para leer (tooltip, tabla, anuncio): sin dato no es cero. */
export function textoDeValor(v: number | null | undefined, formato: (v: number) => string): string {
  return typeof v === "number" && Number.isFinite(v) ? formato(v) : "Sin dato";
}

/**
 * Marco común: leyenda y «Ver tabla» arriba, el área enfocable del gráfico (rol `group`,
 * flechas para recorrer), la región `aria-live` que anuncia el punto activo y, al abrirla,
 * la tabla con los mismos datos.
 */
export function MarcoDelGrafico({
  title,
  leyenda,
  columnas,
  datos,
  vacio,
  emptyMessage,
  anuncio,
  alTeclado,
  alSalir,
  refAncho,
  className,
  children,
}: {
  title: string;
  leyenda?: ReactNode;
  columnas: Column<ChartDatum>[];
  datos: readonly ChartDatum[];
  vacio: boolean;
  emptyMessage: string;
  anuncio: string;
  alTeclado: (e: KeyboardEvent) => void;
  alSalir: () => void;
  refAncho: RefObject<HTMLDivElement | null>;
  className?: string;
  children: ReactNode;
}) {
  const [tabla, setTabla] = useState(false);
  const idTabla = useId();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <div>{leyenda}</div>
        {!vacio && (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={tabla}
            aria-controls={tabla ? idTabla : undefined}
            onClick={() => setTabla((v) => !v)}
          >
            <Table2 className="h-4 w-4" aria-hidden />
            {tabla ? "Ocultar tabla" : "Ver tabla"}
          </Button>
        )}
      </div>
      <div ref={refAncho} className="relative">
        {vacio ? (
          <p className="py-8 text-center text-sm text-body">{emptyMessage}</p>
        ) : (
          <>
            <div
              tabIndex={0}
              role="group"
              aria-roledescription="gráfico"
              aria-label={`${title}. Usa las flechas izquierda y derecha para recorrer los valores.`}
              onKeyDown={alTeclado}
              onBlur={alSalir}
              className="rounded-md"
            >
              {children}
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {anuncio}
            </p>
          </>
        )}
      </div>
      {tabla && !vacio && (
        <div id={idTabla}>
          <DataTable
            columns={columnas}
            rows={[...datos]}
            getRowKey={(_, i) => String(i)}
            density="compact"
            caption={title}
          />
        </div>
      )}
    </div>
  );
}
