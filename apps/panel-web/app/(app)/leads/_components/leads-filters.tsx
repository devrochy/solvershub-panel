import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Filtro de leads (búsqueda). Form GET: sin estado propio. */
export function LeadsFilters({ q }: { q?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Field label="Buscar" htmlFor="q" className="w-64">
        <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Nombre o identificador" />
      </Field>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {q && (
        <Link href="/leads" className="pb-2.5 text-sm text-link hover:underline">
          Limpiar
        </Link>
      )}
    </form>
  );
}
