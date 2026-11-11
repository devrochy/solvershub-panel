import { Skeleton } from "@/components/ui/skeleton";

/** Una página de lista mientras carga (PLT-12): la cabecera, una línea de filtros y filas con su forma. */
export function CargandoLista({ que, filas = 5 }: { que: string; filas?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Cargando ${que}`} className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-80 max-w-full" />
      <div className="overflow-hidden rounded-lg border border-border-soft">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border-soft px-4 py-3.5 first:border-t-0">
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-48 max-w-full" />
              <Skeleton className="h-2.5 w-64 max-w-full" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
