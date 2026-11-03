"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { cambiarEtapaEnServidor, MotivoDePerdidaDialog } from "@/components/domain/cliente/cambio-de-etapa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ETAPA_PERDIDA, textoDeActividad, textoDeValor, TONO_DE_ETAPA } from "@/lib/clientes";
import { desdeDeColumna, moverTarjeta, sumarPagina, type ColumnaDeEmbudo, type TarjetaDeEmbudo } from "@/lib/embudo";
import { formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

/** Filtros de la vista, para pedir más tarjetas de una columna con los mismos criterios. */
export type ConsultaDelTablero = { agente: string; q?: string; filtros: string[]; orden?: string };

/**
 * Tablero de embudo (HU-CRM-24): una columna por etapa con su cantidad, la suma del valor y las tarjetas
 * más recientes. Quien puede editar clientes mueve una tarjeta arrastrándola a otra columna o con el menú
 * «Mover a…» (teclado, lector de pantalla y toque: arrastrar nunca es la única forma). El movimiento se
 * ve al instante y vuelve atrás si el servidor lo rechaza (el aviso trae su motivo). Mover a «perdido»
 * pide el motivo antes de guardar (HU-CRM-23).
 */
export function TableroEmbudo({
  titulo,
  columnas: inicial,
  pluginId,
  clave,
  motivos,
  puedeMover,
  consulta,
}: {
  titulo: string;
  columnas: ColumnaDeEmbudo[];
  pluginId: string;
  /** Clave del filtro y del campo editable de la etapa (`estado_lead`). */
  clave: string;
  /** Motivos de pérdida que declara el pack; vacío = no se pide motivo. */
  motivos: { value: string; label: string }[];
  puedeMover: boolean;
  consulta: ConsultaDelTablero;
}) {
  const [columnas, setColumnas] = useState(inicial);
  const anterior = useRef(inicial);
  const accion = useAction({ refresh: false, rollback: () => setColumnas(anterior.current) });
  const [pidiendoMotivo, setPidiendoMotivo] = useState<TarjetaDeEmbudo | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);

  const puedeAhora = puedeMover && !accion.pending;

  function pedirMover(tarjeta: TarjetaDeEmbudo, hacia: string) {
    if (!puedeAhora) return;
    const origen = columnas.find((c) => c.tarjetas.some((t) => t.id === tarjeta.id));
    if (!origen || origen.value === hacia) return;
    if (hacia === ETAPA_PERDIDA && motivos.length > 0) {
      setPidiendoMotivo(tarjeta);
      return;
    }
    void mover(tarjeta, hacia);
  }

  async function mover(tarjeta: TarjetaDeEmbudo, hacia: string, extra: Record<string, string> = {}) {
    anterior.current = columnas;
    setColumnas(moverTarjeta(columnas, tarjeta.id, hacia));
    await accion.run(() =>
      cambiarEtapaEnServidor({
        leadId: tarjeta.id,
        pluginId,
        clave,
        valor: hacia,
        extra,
        nombre: tarjeta.nombre,
        etiqueta: columnas.find((c) => c.value === hacia)?.label ?? hacia,
      }),
    );
  }

  async function verMas(columna: ColumnaDeEmbudo) {
    setCargando(columna.value);
    try {
      const qs = new URLSearchParams({
        agente: consulta.agente,
        clave,
        valor: columna.value,
        desde: String(desdeDeColumna(columna)),
      });
      if (consulta.q) qs.set("q", consulta.q);
      for (const f of consulta.filtros) qs.append("filtro", f);
      if (consulta.orden) qs.set("orden", consulta.orden);
      const res = await fetch(`/api/leads/embudo?${qs.toString()}`);
      const json = (await res.json().catch(() => ({}))) as {
        tarjetas?: TarjetaDeEmbudo[];
        hay_mas?: boolean;
        error?: unknown;
      };
      if (!res.ok || !Array.isArray(json.tarjetas)) {
        toast.error(typeof json.error === "string" && json.error ? json.error : "No se pudieron cargar más clientes.");
        return;
      }
      const tarjetas = json.tarjetas;
      setColumnas((actual) => sumarPagina(actual, columna.value, tarjetas, Boolean(json.hay_mas)));
    } catch {
      toast.error("No se pudo contactar el servidor.");
    } finally {
      setCargando(null);
    }
  }

  return (
    <>
      <div
        role="group"
        aria-label={titulo}
        className="grid auto-cols-[minmax(16rem,1fr)] grid-flow-col snap-x snap-proximity gap-3 overflow-x-auto pb-2"
      >
        {columnas.map((c) => (
          <section
            key={c.value}
            aria-labelledby={`columna-${c.value}`}
            onDragOver={(e) => {
              if (!puedeAhora) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (sobre !== c.value) setSobre(c.value);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSobre(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setSobre(null);
              const id = e.dataTransfer.getData("text/plain");
              const tarjeta = columnas.flatMap((col) => col.tarjetas).find((t) => t.id === id);
              if (tarjeta) pedirMover(tarjeta, c.value);
            }}
            className={cn(
              "flex min-h-40 snap-start flex-col gap-2 rounded-lg border border-border-soft bg-surface-alt p-2 transition-colors",
              sobre === c.value && "border-focus bg-hover",
            )}
          >
            <header className="flex flex-col gap-0.5 px-1 pt-1">
              <div className="flex items-center justify-between gap-2">
                <h3 id={`columna-${c.value}`} className="text-sm font-medium text-headline">
                  {c.label}
                </h3>
                <Badge variant={TONO_DE_ETAPA[c.value] ?? "neutral"}>{formatNumber(c.total)}</Badge>
              </div>
              {c.suma !== null && c.suma > 0 && <p className="text-xs text-text-soft">{textoDeValor(c.suma)}</p>}
            </header>

            {c.error ? (
              <p role="alert" className="px-1 text-sm text-status-danger-fg">
                {c.error}
              </p>
            ) : c.tarjetas.length === 0 ? (
              <p className="px-1 text-sm text-text-soft">Sin clientes en esta etapa.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {c.tarjetas.map((t) => (
                  <Tarjeta
                    key={t.id}
                    tarjeta={t}
                    columnaActual={c.value}
                    destinos={columnas}
                    puedeMover={puedeMover}
                    deshabilitada={accion.pending}
                    alMover={(hacia) => pedirMover(t, hacia)}
                  />
                ))}
              </ul>
            )}

            {c.hayMas && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <p className="text-xs text-text-soft">
                  Mostrando {formatNumber(c.tarjetas.length)} de {formatNumber(c.total)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cargando === c.value}
                  onClick={() => void verMas(c)}
                  aria-label={`Ver más clientes en ${c.label}`}
                >
                  {cargando === c.value ? "Cargando…" : "Ver más"}
                </Button>
              </div>
            )}
          </section>
        ))}
      </div>

      <MotivoDePerdidaDialog
        abierto={pidiendoMotivo !== null}
        alCambiar={(abierto) => {
          if (!abierto) setPidiendoMotivo(null);
        }}
        leadId={pidiendoMotivo?.id ?? ""}
        nombre={pidiendoMotivo?.nombre ?? ""}
        motivos={motivos}
        alConfirmar={(extra) => {
          const tarjeta = pidiendoMotivo;
          setPidiendoMotivo(null);
          if (tarjeta) void mover(tarjeta, ETAPA_PERDIDA, extra);
        }}
      />
    </>
  );
}

function Tarjeta({
  tarjeta,
  columnaActual,
  destinos,
  puedeMover,
  deshabilitada,
  alMover,
}: {
  tarjeta: TarjetaDeEmbudo;
  columnaActual: string;
  destinos: ColumnaDeEmbudo[];
  puedeMover: boolean;
  deshabilitada: boolean;
  alMover: (hacia: string) => void;
}) {
  return (
    <li
      draggable={puedeMover && !deshabilitada}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", tarjeta.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-border-soft bg-surface p-3",
        puedeMover && !deshabilitada && "cursor-grab active:cursor-grabbing",
      )}
    >
      <Link href={tarjeta.href} className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-medium text-link hover:underline">
        {tarjeta.nombre}
      </Link>
      <p className="flex flex-wrap items-center gap-x-3 text-xs text-body">
        {tarjeta.puntaje !== null && <span>Puntaje {formatNumber(tarjeta.puntaje)}</span>}
        <span>{textoDeValor(tarjeta.valor)}</span>
      </p>
      <p className="text-xs text-text-soft">Última actividad: {textoDeActividad(tarjeta.actividad)}</p>
      {tarjeta.vencido && (
        <div>
          <Badge variant="danger">Seguimiento vencido</Badge>
        </div>
      )}
      {puedeMover && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={deshabilitada}
              aria-label={`Mover a ${tarjeta.nombre} a otra etapa`}
              className="inline-flex min-h-11 items-center gap-1 self-start rounded-md px-1 text-sm text-link outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60 md:min-h-9"
            >
              Mover a…
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {destinos
              .filter((d) => d.value !== columnaActual)
              .map((d) => (
                <DropdownMenuItem key={d.value} onSelect={() => alMover(d.value)}>
                  {d.label}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
