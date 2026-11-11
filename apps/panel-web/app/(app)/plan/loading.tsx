import { Skeleton } from "@/components/ui/skeleton";

/** Mientras carga Consumo y plan (CYP-12): la cabecera, el crédito, el plan y la forma de las listas. */
export default function CargandoConsumo() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando tu consumo" className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 rounded-lg border border-border-soft p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-3 w-80 max-w-full" />
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-border-soft p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border-soft">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border-soft px-4 py-3.5 first:border-t-0">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-1.5 flex-1 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
