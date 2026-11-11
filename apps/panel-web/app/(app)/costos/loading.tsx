import { Skeleton } from "@/components/ui/skeleton";

/** Mientras cargan los costos técnicos (CYP-12): la cabecera, las cifras y la forma de las tablas. */
export default function CargandoCostos() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando los costos" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border-soft">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border-soft px-4 py-3.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="ml-auto h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
