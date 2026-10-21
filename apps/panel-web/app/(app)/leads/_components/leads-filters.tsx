import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ConversationConnection, LeadFilter } from "@/lib/api/types";
import { valorDeFiltro, type FiltrosClientes } from "@/lib/clientes";
import { CANAL } from "@/lib/labels";

const CANALES = ["whatsapp", "instagram", "messenger", "webchat", "email"];

/** Filtros de Clientes: búsqueda, canal, conexión y los que aportan las habilidades. Form GET. */
export function LeadsFilters({
  sp,
  connections = [],
  filters = [],
}: {
  sp: FiltrosClientes;
  connections?: ConversationConnection[];
  filters?: LeadFilter[];
}) {
  const activos = Boolean(sp.q || sp.channel || sp.connection_id || valorDeFiltrosActivos(sp, filters));
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <Field label="Buscar" htmlFor="q" className="w-60">
        <Input id="q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Nombre, identificador o teléfono" />
      </Field>
      <Field label="Canal" htmlFor="channel" className="w-40">
        <Select id="channel" name="channel" defaultValue={sp.channel ?? ""}>
          <option value="">Todos</option>
          {CANALES.map((c) => (
            <option key={c} value={c}>
              {CANAL[c] ?? c}
            </option>
          ))}
        </Select>
      </Field>
      {connections.length > 1 && (
        <Field label="Conexión" htmlFor="connection_id" className="w-52">
          <Select id="connection_id" name="connection_id" defaultValue={sp.connection_id ?? ""}>
            <option value="">Todas</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {filters.map((f) => {
        const valor = valorDeFiltro(sp.filtro, f.key);
        return (
          <Field key={f.key} label={f.label} htmlFor={`filtro-${f.key}`} className="w-44">
            <Select id={`filtro-${f.key}`} name="filtro" defaultValue={valor ? `${f.key}:${valor}` : ""}>
              <option value="">Todos</option>
              {f.options.map((o) => (
                <option key={o.value} value={`${f.key}:${o.value}`}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        );
      })}
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {activos && (
        <Link href="/leads" className="pb-2.5 text-sm text-link hover:underline">
          Limpiar
        </Link>
      )}
    </form>
  );
}

function valorDeFiltrosActivos(sp: FiltrosClientes, filters: LeadFilter[]): boolean {
  return filters.some((f) => valorDeFiltro(sp.filtro, f.key) !== "");
}
