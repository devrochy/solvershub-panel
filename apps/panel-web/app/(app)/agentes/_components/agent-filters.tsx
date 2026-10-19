import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { PERIODOS, type Pestana } from "@/lib/agentes";

/**
 * Filtros de la vista de un agente (período y conexión). Form GET: conserva la pestaña.
 * Los `Select` no controlados llevan `key` con su valor: al navegar en el cliente (Limpiar,
 * una pestaña) React reutiliza el nodo y `defaultValue` no se vuelve a aplicar (HU-UX-12).
 */
export function AgentFilters({
  baseHref,
  tab,
  dias,
  conexion,
  connections,
}: {
  baseHref: string;
  tab: Pestana;
  dias: number;
  conexion: string | null;
  connections: { id: string; label: string }[];
}) {
  return (
    <form method="get" action={baseHref} className="flex flex-wrap items-end gap-3">
      {tab !== "conversaciones" && <input type="hidden" name="tab" value={tab} />}
      <Field label="Período" htmlFor="dias" className="w-44">
        <Select key={dias} id="dias" name="dias" defaultValue={String(dias)}>
          {PERIODOS.map((p) => (
            <option key={p.dias} value={p.dias}>
              {p.label}
            </option>
          ))}
        </Select>
      </Field>
      {connections.length > 1 && (
        <Field label="Conexión" htmlFor="conexion" className="w-56">
          <Select key={conexion ?? ""} id="conexion" name="conexion" defaultValue={conexion ?? ""}>
            <option value="">Todas</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {(conexion || dias !== 30) && (
        <Link href={tab === "conversaciones" ? baseHref : `${baseHref}?tab=${tab}`} className="pb-2.5 text-sm text-link hover:underline">
          Limpiar
        </Link>
      )}
    </form>
  );
}
