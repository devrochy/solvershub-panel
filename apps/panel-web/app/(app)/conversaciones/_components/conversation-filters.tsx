"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ChannelIcon, channelMeta } from "@/components/domain/channel-icon";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectConIcono, type Opcion } from "@/components/ui/select-con-icono";
import type { ConversationConnection } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ESTADOS = [
  { value: "", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "escalated", label: "Escaladas" },
  { value: "closed", label: "Cerradas" },
];

type Cambios = { q?: string; status?: string; connection_id?: string };

/**
 * Filtros de la bandeja: búsqueda (Enter busca, Escape limpia), estado y, en la fila del
 * conteo, la conexión. Cada cambio navega al servidor con la query nueva y cierra el chat
 * abierto, como antes.
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
    { value: "", label: "Todas las conexiones" },
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
      className={cn("flex flex-col gap-2.5 transition-opacity", pending && "opacity-70")}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navegar({ q: texto });
        }}
      >
        <SearchInput
          label="Buscar conversaciones"
          value={texto}
          onChange={(valor) => {
            setTexto(valor);
            if (!valor && texto) navegar({ q: "" });
          }}
          placeholder="Buscar cliente o número"
          shortcut="/"
        />
      </form>

      <SegmentedControl
        label="Filtrar por estado"
        options={ESTADOS}
        value={estado}
        onChange={(valor) => {
          setEstado(valor);
          navegar({ status: valor });
        }}
      />

      <div className="flex min-h-9 items-center justify-between gap-2">
        <span className="text-xs tabular-nums text-text-soft">
          {total === 1 ? "1 conversación" : `${total} conversaciones`}
        </span>
        <div className="flex min-w-0 items-center gap-3">
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiar}
              className="shrink-0 rounded-sm text-sh-label text-link hover:underline focus-visible:outline-2"
            >
              Limpiar filtros
            </button>
          )}
          {connections.length > 1 && (
            <SelectConIcono
              compacto
              label="Conexión"
              value={conexion}
              options={opcionesConexion}
              onChange={(value) => {
                setConexion(value);
                navegar({ connection_id: value });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
