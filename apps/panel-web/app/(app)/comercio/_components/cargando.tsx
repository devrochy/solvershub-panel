import { Skeleton } from "@/components/ui/skeleton";

/** Mientras carga una vista de Ventas (VEN-16): la cabecera, los filtros y la forma de la lista. */
export function CargandoVentas({ que, tarjetas = false, filas = 5 }: { que: string; tarjetas?: boolean; filas?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Cargando ${que}`} className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      {tarjetas ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="ml-auto h-9 w-40" />
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border-soft">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-border-soft px-4 py-3.5 first:border-t-0">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-48 max-w-full" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full max-sm:hidden" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
