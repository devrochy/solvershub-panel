import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLinkItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PERIODOS } from "@/lib/agentes";

/**
 * Período y conexión de una vista de agentes (AGT-05): se aplican al tocarlos, sin «Filtrar». El
 * período es un control segmentado y la conexión, con más de una, un menú. Todo viaja en la URL.
 */
export function AgentFilters({
  dias,
  hrefDias,
  conexion,
  connections,
  hrefConexion,
}: {
  dias: number;
  hrefDias: (dias: number) => string;
  conexion: string | null;
  connections: { id: string; label: string }[];
  hrefConexion: (id: string | null) => string;
}) {
  const actual = connections.find((c) => c.id === conexion);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {connections.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" aria-label={`Conexión: ${actual?.label ?? "todas"}`}>
              {actual?.label ?? "Todas las conexiones"}
              <ChevronDown className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLinkItem href={hrefConexion(null)} current={!actual}>
              Todas las conexiones
            </DropdownMenuLinkItem>
            {connections.map((c) => (
              <DropdownMenuLinkItem key={c.id} href={hrefConexion(c.id)} current={c.id === actual?.id}>
                {c.label}
              </DropdownMenuLinkItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <SegmentedControl
        label="Período"
        value={String(dias)}
        options={PERIODOS.map((p) => ({ value: String(p.dias), label: p.label, href: hrefDias(p.dias) }))}
      />
    </div>
  );
}
