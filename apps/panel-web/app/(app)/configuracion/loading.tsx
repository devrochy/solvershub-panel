import { Skeleton } from "@/components/ui/skeleton";

/** Mientras carga Configuración: la cabecera y los grupos del resumen (CFG-09). */
export default function CargandoConfiguracion() {
  return (
    <div role="status" className="flex max-w-4xl flex-col gap-6" aria-busy="true" aria-label="Cargando la configuración">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      {[3, 3, 2].map((n, g) => (
        <div key={g} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <div className="overflow-hidden rounded-lg border border-border-soft">
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-t border-border-soft px-4 py-4 first:border-t-0">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
