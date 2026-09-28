import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

/** Paginación uniforme: recibe el estado y una función que construye el href. */
export function Pagination({
  page,
  hasMore,
  total,
  label,
  makeHref,
}: {
  page: number;
  hasMore: boolean;
  total: number;
  label: string;
  makeHref: (page: number) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-body">
      <span>
        {formatNumber(total)} {label} · página {page}
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
