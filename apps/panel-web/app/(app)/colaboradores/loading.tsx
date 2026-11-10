import { Skeleton } from "@/components/ui/skeleton";

/** Mientras carga Equipo: la cabecera y la forma de la tabla (EQU-13). */
export default function CargandoEquipo() {
  return (
    <div role="status" className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando el equipo">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border-soft">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-border-soft px-4 py-3.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="ml-auto h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
