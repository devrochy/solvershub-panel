"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useShell } from "@/components/shell/shell-context";

/**
 * Búsqueda de un cliente sin saber su cartera. El cliente es hijo de la cartera, así que su
 * lista ya no es una pestaña de Cobranza: se llega desde aquí. Solo se ofrece con el permiso
 * `pack_cobranza:clientes`.
 */
export function BuscarCliente() {
  const shell = useShell();
  if (shell && !shell.permisos?.["pack_cobranza:clientes"]) return null;
  return (
    <form method="get" action="/cobranza/clientes" role="search" className="flex flex-wrap items-end gap-3">
      <Field label="Buscar cliente" htmlFor="q" className="w-72">
        <Input id="q" name="q" placeholder="Nombre o documento" />
      </Field>
      <Button type="submit" variant="outline">
        <Search className="h-4 w-4" aria-hidden /> Buscar
      </Button>
    </form>
  );
}
