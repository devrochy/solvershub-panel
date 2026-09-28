import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CONVERSATION_STATUS } from "@/components/domain/status-badge";

/** Filtros de conversaciones (búsqueda + estado). Form GET. */
export function ConversationFilters({ q, status }: { q?: string; status?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Field label="Buscar" htmlFor="q" className="w-64">
        <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Cliente o identificador" />
      </Field>
      <Field label="Estado" htmlFor="status" className="w-44">
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Todos</option>
          {Object.entries(CONVERSATION_STATUS).map(([value, entry]) => (
            <option key={value} value={value}>
              {entry.label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {(q || status) && (
        <Link href="/conversaciones" className="pb-2.5 text-sm text-link hover:underline">
          Limpiar
        </Link>
      )}
    </form>
  );
}
