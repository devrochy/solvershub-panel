"use client";

import { useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import type { QaItem } from "@/lib/api/types";
import { agrupar, areas, entornos, type Filtros } from "@/lib/qa/lista";
import { cn } from "@/lib/utils";

import { IconoEstado } from "./icono-estado";

/**
 * Lista lateral de pruebas (HU-QA-03 y HU-QA-08): buscador, filtros y las pruebas agrupadas
 * por entorno (Panel, APK, WhatsApp, Web, API) y por sección, con lo que llevo terminado de
 * cada nivel. Cada prueba es un botón (la elegida con `aria-current`); con el foco en la
 * lista, ↑ y ↓ cambian de prueba e Inicio y Fin van a los extremos.
 */
export function ListaDePruebas({
  items,
  visibles,
  filtros,
  onFiltros,
  seleccion,
  onElegir,
  estadoDe,
}: {
  items: QaItem[];
  visibles: QaItem[];
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  seleccion: string | null;
  onElegir: (slug: string) => void;
  estadoDe: (slug: string) => string;
}) {
  const [plegados, setPlegados] = useState<Set<string>>(new Set());
  const grupos = agrupar(visibles, estadoDe);
  const ordenVisible = grupos
    .filter((g) => !plegados.has(g.id))
    .flatMap((g) => g.areas.filter((a) => !plegados.has(a.id)).flatMap((a) => a.items));

  function alternar(id: string) {
    setPlegados((prev) => {
      const sig = new Set(prev);
      if (sig.has(id)) sig.delete(id);
      else sig.add(id);
      return sig;
    });
  }

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (ordenVisible.length === 0) return;
    const i = ordenVisible.findIndex((x) => x.slug === seleccion);
    let destino: number | null = null;
    if (e.key === "ArrowDown") destino = Math.min(i + 1, ordenVisible.length - 1);
    if (e.key === "ArrowUp") destino = Math.max(i - 1, 0);
    if (e.key === "Home") destino = 0;
    if (e.key === "End") destino = ordenVisible.length - 1;
    if (destino === null) return;
    e.preventDefault();
    const slug = ordenVisible[destino].slug;
    onElegir(slug);
    const boton = document.getElementById(`prueba-${slug}`);
    boton?.focus();
    boton?.scrollIntoView({ block: "nearest" });
  }

  const opcionesDeArea = areas(items, filtros.entorno);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <SearchInput
        label="Buscar pruebas"
        placeholder="Buscar por título, sección o HU"
        value={filtros.texto}
        onChange={(texto) => onFiltros({ ...filtros, texto })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Select
          aria-label="Filtrar por entorno"
          value={filtros.entorno}
          // Cambiar de entorno limpia la sección: puede no existir en el nuevo.
          onChange={(e) => onFiltros({ ...filtros, entorno: e.target.value, area: "" })}
        >
          <option value="">Todos los entornos</option>
          {entornos(items).map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por sección"
          value={filtros.area}
          onChange={(e) => onFiltros({ ...filtros, area: e.target.value })}
        >
          <option value="">Todas las secciones</option>
          {opcionesDeArea.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por estado"
          className="col-span-2"
          value={filtros.estado}
          onChange={(e) => onFiltros({ ...filtros, estado: e.target.value as Filtros["estado"] })}
        >
          <option value="todas">Todas</option>
          <option value="pendientes">Sin terminar</option>
          <option value="terminadas">Terminadas</option>
          <option value="falla">Con falla</option>
          <option value="bloqueada">Bloqueadas</option>
        </Select>
      </div>
      <Checkbox
        id="filtro-humo"
        label="Solo pruebas de humo (P0)"
        checked={filtros.soloHumo}
        onCheckedChange={(v) => onFiltros({ ...filtros, soloHumo: v })}
      />
      <p className="text-xs text-text-soft" aria-live="polite">
        {visibles.length === items.length ? `${items.length} pruebas` : `${visibles.length} de ${items.length} pruebas`}
      </p>

      <nav
        aria-label="Pruebas del catálogo"
        onKeyDown={teclas}
        className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-2"
      >
        {grupos.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-body">Ninguna prueba coincide con los filtros.</p>
        )}
        {grupos.map((entorno) => {
          const plegado = plegados.has(entorno.id);
          return (
            <section key={entorno.id} aria-label={`Entorno ${entorno.titulo}`} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => alternar(entorno.id)}
                aria-expanded={!plegado}
                className="flex flex-col gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-hover"
              >
                <span className="flex items-center gap-2">
                  <ChevronDown
                    aria-hidden
                    className={cn("h-4 w-4 shrink-0 text-text-soft transition-transform", plegado && "-rotate-90")}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-headline">{entorno.titulo}</span>
                  <span className="shrink-0 text-xs tabular-nums text-text-soft">
                    {entorno.terminadas}/{entorno.items.length}
                  </span>
                </span>
                <Progress
                  size="sm"
                  value={entorno.terminadas}
                  max={entorno.items.length}
                  label={`Avance en ${entorno.titulo}`}
                  valueText={`${entorno.terminadas} de ${entorno.items.length} terminadas`}
                />
              </button>
              {!plegado &&
                entorno.areas.map((area) => {
                  const areaPlegada = plegados.has(area.id);
                  return (
                    <div key={area.id} className="flex flex-col gap-0.5 pl-2">
                      <button
                        type="button"
                        onClick={() => alternar(area.id)}
                        aria-expanded={!areaPlegada}
                        className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs font-medium text-body hover:bg-hover"
                      >
                        <ChevronDown
                          aria-hidden
                          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", areaPlegada && "-rotate-90")}
                        />
                        <span className="min-w-0 flex-1 truncate">{area.titulo}</span>
                        <span className="shrink-0 tabular-nums text-text-soft">
                          {area.terminadas}/{area.items.length}
                        </span>
                      </button>
                      {!areaPlegada &&
                        area.items.map((item) => {
                          const activo = item.slug === seleccion;
                          return (
                            <button
                              type="button"
                              key={item.slug}
                              id={`prueba-${item.slug}`}
                              aria-current={activo ? "true" : undefined}
                              onClick={() => onElegir(item.slug)}
                              className={cn(
                                "flex items-start gap-2 rounded-md border-l-2 px-2 py-1.5 text-left text-sm",
                                activo
                                  ? "border-focus bg-surface-2 text-headline"
                                  : "border-transparent text-body hover:bg-hover hover:text-headline",
                              )}
                            >
                              <IconoEstado estado={estadoDe(item.slug)} className="mt-0.5" />
                              <span className="min-w-0 flex-1 leading-snug">{item.titulo}</span>
                              {item.prioridad === "P0" && (
                                <span
                                  className="shrink-0 rounded-sm bg-hover px-1 text-[11px] font-medium text-body"
                                  title="Prueba de humo"
                                >
                                  P0
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  );
                })}
            </section>
          );
        })}
      </nav>
    </div>
  );
}
