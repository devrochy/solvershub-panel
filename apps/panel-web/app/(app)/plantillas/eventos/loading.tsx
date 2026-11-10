import { Skeleton } from "@/components/ui/skeleton";

/** Mientras cargan los avisos: la cabecera y las dos listas por módulo (PLA-12). */
export default function CargandoAvisos() {
  return (
    <div role="status" className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando los avisos">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {[4, 3].map((n, g) => (
          <div key={g} className="overflow-hidden rounded-lg border border-border-soft">
            <Skeleton className="m-4 h-4 w-32" />
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="flex items-center gap-3 border-t border-border-soft px-4 py-4">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="ml-auto h-5 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
