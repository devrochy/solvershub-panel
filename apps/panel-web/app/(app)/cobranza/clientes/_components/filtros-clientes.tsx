"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CarteraOpcion } from "./client-dialog";

/** Filtros de la búsqueda de clientes: cada cambio navega con la query nueva, sin botón «Filtrar». */
export function FiltrosClientes({
  carteras,
  cartera,
  q,
}: {
  carteras: CarteraOpcion[];
  cartera?: string;
  q?: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [texto, setTexto] = useState(q ?? "");

  function navegar(cambios: { cartera?: string; q?: string }) {
    const siguiente = { cartera: cartera ?? "", q: texto, ...cambios };
    const qs = new URLSearchParams();
    if (siguiente.cartera) qs.set("cartera", siguiente.cartera);
    if (siguiente.q) qs.set("q", siguiente.q);
    startTransition(() => router.push(`/cobranza/clientes${qs.size ? `?${qs}` : ""}`));
  }

  function limpiar() {
    setTexto("");
    startTransition(() => router.push("/cobranza/clientes"));
  }

  return (
    <div aria-busy={pendiente || undefined} className={cn("flex w-full flex-col gap-2.5 transition-opacity md:flex-row md:flex-wrap md:items-center md:gap-3", pendiente && "opacity-70")}>
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
          placeholder="Buscar nombre o documento"
          shortcut="/"
        />
      </form>
      <Select key={cartera ?? ""} aria-label="Cartera" className="md:w-56" defaultValue={cartera ?? ""} onChange={(e) => navegar({ cartera: e.target.value })}>
        <option value="">Todas las carteras</option>
        {carteras.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>
      {(cartera || q) && (
        <button type="button" onClick={limpiar} className="min-h-11 self-start rounded-sm text-sh-label text-link hover:underline focus-visible:outline-2 md:min-h-0 md:self-center">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
