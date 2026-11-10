"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import type { ConversationConnection, LeadFilter } from "@/lib/api/types";
import { consultaClientes, filtrosDePacks, valorDeFiltro, type FiltrosClientes } from "@/lib/clientes";
import { CANAL } from "@/lib/labels";
import { cn } from "@/lib/utils";

const CANALES = ["whatsapp", "instagram", "messenger", "webchat", "email"];

type Cambios = Pick<FiltrosClientes, "q" | "channel" | "connection_id" | "filtro">;

/**
 * Filtros de Clientes: búsqueda (Enter busca, Escape limpia), canal, conexión y los que aportan
 * las habilidades. Cada cambio navega con la query nueva; en el celular los selectores se pliegan
 * en «Filtros» para que la lista empiece arriba.
 */
export function LeadsFilters({
  sp,
  connections = [],
  filters = [],
  total,
}: {
  sp: FiltrosClientes;
  connections?: ConversationConnection[];
  filters?: LeadFilter[];
  total: number;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [texto, setTexto] = useState(sp.q ?? "");
  const [abiertos, setAbiertos] = useState(false);
  const activos = consultaClientes(sp, { conPagina: false }).size > 0;

  function navegar(cambios: Cambios) {
    const qs = consultaClientes({ ...sp, q: texto, ...cambios }, { conPagina: false });
    startTransition(() => router.push(`/leads${qs.size ? `?${qs}` : ""}`));
  }

  function limpiar() {
    setTexto("");
    startTransition(() => router.push("/leads"));
  }

  function cambiarFiltroDePack(clave: string, valor: string) {
    const otros = filtrosDePacks(sp.filtro).filter((f) => !f.startsWith(`${clave}:`));
    navegar({ filtro: valor ? [...otros, valor] : otros });
  }

  return (
    <div
      aria-busy={pendiente || undefined}
      className={cn("flex w-full flex-col gap-2.5 transition-opacity md:flex-row md:flex-wrap md:items-center md:gap-3", pendiente && "opacity-70")}
    >
      <form
        className="md:w-80"
        onSubmit={(e) => {
          e.preventDefault();
          navegar({ q: texto });
        }}
      >
        <SearchInput
          label="Buscar clientes"
          value={texto}
          onChange={(valor) => {
            setTexto(valor);
            if (!valor && texto) navegar({ q: "" });
          }}
          placeholder="Buscar nombre o teléfono"
          shortcut="/"
        />
      </form>

      <div className="flex items-center justify-between gap-2 md:hidden">
        <span className="text-xs tabular-nums text-text-soft">{total === 1 ? "1 cliente" : `${total} clientes`}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={abiertos}
          onClick={() => setAbiertos((actual) => !actual)}
        >
          Filtros
        </Button>
      </div>

      <div className={cn("flex-col gap-2.5 md:flex md:flex-row md:flex-wrap md:items-center md:gap-3", abiertos ? "flex" : "hidden")}>
        <Select
          key={`canal-${sp.channel ?? ""}`}
          aria-label="Canal"
          className="md:w-48"
          defaultValue={sp.channel ?? ""}
          onChange={(e) => navegar({ channel: e.target.value })}
        >
          <option value="">Todos los canales</option>
          {CANALES.map((c) => (
            <option key={c} value={c}>
              {CANAL[c] ?? c}
            </option>
          ))}
        </Select>
        {connections.length > 1 && (
          <Select
            key={`conexion-${sp.connection_id ?? ""}`}
            aria-label="Conexión"
            className="md:w-52"
            defaultValue={sp.connection_id ?? ""}
            onChange={(e) => navegar({ connection_id: e.target.value })}
          >
            <option value="">Todas las conexiones</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
        {filters.map((f) => {
          const valor = valorDeFiltro(sp.filtro, f.key);
          return (
            <Select
              key={`${f.key}-${valor}`}
              aria-label={f.label}
              className="md:w-44"
              defaultValue={valor ? `${f.key}:${valor}` : ""}
              onChange={(e) => cambiarFiltroDePack(f.key, e.target.value)}
            >
              <option value="">{f.label}: todos</option>
              {f.options.map((o) => (
                <option key={o.value} value={`${f.key}:${o.value}`}>
                  {o.label}
                </option>
              ))}
            </Select>
          );
        })}
      </div>

      {activos && (
        <button
          type="button"
          onClick={limpiar}
          className="self-start rounded-sm text-sh-label text-link hover:underline focus-visible:outline-2 md:self-center"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
