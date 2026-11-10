"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SearchInput } from "@/components/ui/search-input";
import { useShell } from "@/components/shell/shell-context";

/**
 * Búsqueda de un cliente sin saber su cartera. El cliente es hijo de la cartera, así que su
 * lista ya no es una pestaña de Cobranza: se llega desde aquí con Enter. Solo se ofrece con el
 * permiso `pack_cobranza:clientes`.
 */
export function BuscarCliente() {
  const shell = useShell();
  const router = useRouter();
  const [texto, setTexto] = useState("");
  if (shell && !shell.permisos?.["pack_cobranza:clientes"]) return null;
  return (
    <form
      role="search"
      className="w-full md:w-80"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/cobranza/clientes${texto ? `?q=${encodeURIComponent(texto)}` : ""}`);
      }}
    >
      <SearchInput label="Buscar cliente" value={texto} onChange={setTexto} placeholder="Buscar cliente o documento" shortcut="/" />
    </form>
  );
}
