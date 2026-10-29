"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers, Search, X } from "lucide-react";

import { ChannelIcon, channelMeta } from "@/components/domain/channel-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectConIcono, type Opcion } from "@/components/ui/select-con-icono";
import type { ConversationConnection } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Estados de la bandeja como control segmentado (mutuamente excluyentes, 4 opciones). */
const ESTADOS = [
  { value: "", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "escalated", label: "Escaladas" },
  { value: "closed", label: "Cerradas" },
] as const;

type Cambios = { q?: string; status?: string; connection_id?: string };

/**
 * Filtros de la bandeja: tabs de estado, búsqueda y conexión con su icono.
 *
 * El estado es un control segmentado (HIG: 2–5 opciones, selección siempre visible) y la
 * conexión se elige en una lista con el icono y el color de su canal. Cada cambio navega al
 * servidor con la query nueva y cierra el chat abierto, como antes.
 */
export function ConversationFilters({
  q,
  status,
  connectionId,
  connections = [],
  total,
}: {
  q?: string;
  status?: string;
  connectionId?: string;
  connections?: ConversationConnection[];
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [texto, setTexto] = useState(q ?? "");
  const [estado, setEstado] = useState(status ?? "");
  const [conexion, setConexion] = useState(connectionId ?? "");
  const hayFiltros = Boolean(texto.trim() || estado || conexion);

  function navegar(cambios: Cambios = {}) {
    const qs = new URLSearchParams();
    const qFinal = (cambios.q ?? texto).trim();
    const statusFinal = cambios.status ?? estado;
    const connFinal = cambios.connection_id ?? conexion;
    if (qFinal) qs.set("q", qFinal);
    if (statusFinal) qs.set("status", statusFinal);
    if (connFinal) qs.set("connection_id", connFinal);
    startTransition(() => router.push(`/conversaciones${qs.size ? `?${qs}` : ""}`));
  }

  function limpiar() {
    setTexto("");
    setEstado("");
    setConexion("");
    startTransition(() => router.push("/conversaciones"));
  }

  const opcionesConexion: Opcion[] = [
    {
      value: "",
      label: "Todas las conexiones",
      icono: <Layers aria-hidden className="h-4 w-4 text-text-soft" />,
    },
    ...connections.map((c) => {
      const id = c.type_id ?? c.channel;
      return {
        value: c.id,
        label: c.label || channelMeta(id).label,
        icono: <ChannelIcon id={id} size="sm" />,
      };
    }),
  ];

  return (
    <div
      aria-busy={pending || undefined}
      className={cn("flex flex-col gap-2 transition-opacity", pending && "opacity-70")}
    >
      <div
        role="group"
        aria-label="Filtrar por estado"
        className="grid grid-cols-4 gap-1 rounded-xl border border-border-soft bg-bg-deep p-1"
      >
        {ESTADOS.map((opcion) => {
          const activo = estado === opcion.value;
          return (
            <button
              key={opcion.value || "todas"}
              type="button"
              aria-pressed={activo}
              onClick={() => {
                setEstado(opcion.value);
                navegar({ status: opcion.value });
              }}
              className={cn(
                "h-8 rounded-lg px-1 text-xs font-medium transition-all duration-200",
                "focus-visible:outline-2 focus-visible:outline-offset-1",
                activo
                  ? "bg-surface-raised text-headline shadow-elev-1 ring-1 ring-focus/30"
                  : "text-text-soft hover:bg-hover hover:text-headline",
              )}
            >
              {opcion.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          navegar({ q: texto });
        }}
        className="relative"
      >
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft"
        />
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          type="search"
          placeholder="Buscar cliente o identificador"
          aria-label="Buscar conversaciones"
          className="pl-9 pr-9"
        />
        {texto && (
          <button
            type="button"
            onClick={() => {
              setTexto("");
              navegar({ q: "" });
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-hover hover:text-headline focus-visible:outline-2"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
      </form>

      {connections.length > 1 && (
        <SelectConIcono
          label="Conexión"
          value={conexion}
          options={opcionesConexion}
          onChange={(value) => {
            setConexion(value);
            navegar({ connection_id: value });
          }}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs tabular-nums text-text-soft">{total} conversaciones</span>
        <div className="flex items-center gap-1">
          {hayFiltros && (
            <Button type="button" variant="ghost" size="sm" onClick={limpiar}>
              Limpiar
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => navegar({ q: texto })}>
            Buscar
          </Button>
        </div>
      </div>
    </div>
  );
}
