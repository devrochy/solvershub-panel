import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

/**
 * Paginación uniforme: recibe el estado y una función que construye el href. `label` es el
 * plural («clientes») y `singular` la forma para un solo elemento («cliente»).
 */
export function Pagination({
  page,
  hasMore,
  total,
  label,
  singular,
  makeHref,
}: {
  page: number;
  hasMore: boolean;
  total: number;
  label: string;
  singular?: string;
  makeHref: (page: number) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-body">
      <span>
        {formatNumber(total)} {total === 1 && singular ? singular : label} · página {page}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="sm">
            <Link href={makeHref(page - 1)}>Anterior</Link>
          </Button>
        )}
        {hasMore && (
          <Button asChild variant="outline" size="sm">
            <Link href={makeHref(page + 1)}>Siguiente</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
