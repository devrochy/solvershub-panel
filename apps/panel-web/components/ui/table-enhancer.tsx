"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const TAMANOS = [10, 20, 50, 100];

/**
 * Realzador de tablas: buscador, orden por columna y paginación, al estilo del
 * panel clásico (`_datatable.html` + `table.js`). La tabla la sigue renderizando
 * el servidor; este cliente solo opera sobre el DOM (mostrar/ocultar y reordenar
 * filas), así que no hay que tocar las páginas.
 */
export function TableEnhancer({ pageSize = 20 }: { pageSize?: number }) {
  const ancla = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(pageSize);
  const [orden, setOrden] = useState<{ col: number; asc: boolean } | null>(null);
  const [resumen, setResumen] = useState({ visibles: 0, total: 0, paginas: 1 });

  const buscarTabla = useCallback((): HTMLTableElement | null => {
    const contenedor = ancla.current?.parentElement;
    return contenedor?.querySelector("table") ?? null;
  }, []);

  // Ordenamiento por cabecera (una sola vez por montaje).
  useEffect(() => {
    const tabla = buscarTabla();
    const ths = Array.from(tabla?.querySelectorAll<HTMLTableCellElement>("thead th") ?? []);
    ths.forEach((th, indice) => {
      if (th.dataset.ordenable === "no") return;
      th.style.cursor = "pointer";
      th.title = "Ordenar";
      // Ordenable con teclado y anunciado al lector de pantalla (HU-UI-03).
      th.tabIndex = 0;
      th.setAttribute("aria-sort", "none");
      const manejar = () => {
        setPagina(1);
        setOrden((previo) =>
          previo?.col === indice ? { col: indice, asc: !previo.asc } : { col: indice, asc: true },
        );
      };
      const alPulsar = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          manejar();
        }
      };
      th.addEventListener("click", manejar);
      th.addEventListener("keydown", alPulsar);
      th.dataset.conEscucha = "si";
    });
    return () => {
      ths.forEach((th) => th.replaceWith(th.cloneNode(true)));
    };
  }, [buscarTabla]);

  // `aria-sort` refleja el orden activo: ascendente, descendente o sin orden.
  useEffect(() => {
    const ths = Array.from(buscarTabla()?.querySelectorAll<HTMLTableCellElement>("thead th") ?? []);
    ths.forEach((th, indice) => {
      if (th.dataset.ordenable === "no") return;
      th.setAttribute("aria-sort", orden?.col === indice ? (orden.asc ? "ascending" : "descending") : "none");
    });
  }, [orden, buscarTabla]);

  useEffect(() => {
    const tabla = buscarTabla();
    const tbody = tabla?.querySelector("tbody");
    if (!tbody) return;
    const filas = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"));
    if (filas.length === 0) {
      queueMicrotask(() => setResumen({ visibles: 0, total: 0, paginas: 1 }));
      return;
    }

    // 1) búsqueda por el texto de la fila
    const texto = query.trim().toLowerCase();
    const coinciden = texto
      ? filas.filter((f) => (f.innerText ?? "").toLowerCase().includes(texto))
      : filas.slice();

    // 2) orden por la columna elegida
    if (orden) {
      const valor = (fila: HTMLTableRowElement) => {
        const celda = fila.children[orden.col] as HTMLTableCellElement | undefined;
        const crudo = (celda?.innerText ?? "").trim();
        const numero = Number(crudo.replace(/[^\d.-]/g, ""));
        return Number.isFinite(numero) && /\d/.test(crudo) ? numero : crudo.toLowerCase();
      };
      coinciden.sort((a, b) => {
        const va = valor(a);
        const vb = valor(b);
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
        return orden.asc ? cmp : -cmp;
      });
      coinciden.forEach((fila) => tbody.appendChild(fila));
    }

    // 3) paginación
    const totalPaginas = Math.max(1, Math.ceil(coinciden.length / tamano));
    const actual = Math.min(Math.max(1, pagina), totalPaginas);
    const desde = (actual - 1) * tamano;
    const visibles = new Set(coinciden.slice(desde, desde + tamano));
    filas.forEach((fila) => {
      fila.style.display = coinciden.includes(fila) && visibles.has(fila) ? "" : "none";
    });
    // Estado derivado del DOM: se publica fuera del cuerpo del efecto.
    queueMicrotask(() => {
      setResumen({ visibles: coinciden.length, total: filas.length, paginas: totalPaginas });
      if (actual !== pagina) setPagina(actual);
    });
  }, [query, orden, pagina, tamano, buscarTabla]);

  const hayFiltro = query.trim().length > 0;

  return (
    <div ref={ancla} className="flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-soft" aria-hidden />
        <Input
          aria-label="Buscar en la tabla"
          data-buscador
          className="h-9 w-64 pl-9"
          onChange={(e) => {
            setQuery(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar…"
          value={query}
        />
      </div>

      <Select
        aria-label="Filas por página"
        className="h-9 w-28"
        onChange={(e) => {
          setTamano(Number(e.target.value));
          setPagina(1);
        }}
        value={tamano}
      >
        {TAMANOS.map((n) => (
          <option key={n} value={n}>
            {n} filas
          </option>
        ))}
      </Select>

      <div className="ml-auto flex items-center gap-2 text-sm text-body">
        <span>
          {resumen.visibles}
          {hayFiltro ? ` de ${resumen.total}` : ""} · pág. {pagina}/{resumen.paginas}
        </span>
        <Button
          aria-label="Página anterior"
          disabled={pagina <= 1}
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          size="icon"
          type="button"
          variant="outline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          aria-label="Página siguiente"
          disabled={pagina >= resumen.paginas}
          onClick={() => setPagina((p) => Math.min(resumen.paginas, p + 1))}
          size="icon"
          type="button"
          variant="outline"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
        {orden && (
          <span className="flex items-center gap-1 text-text-soft" title="Orden activo">
            {orden.asc ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          </span>
        )}
      </div>
    </div>
  );
}
