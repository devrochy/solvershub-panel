import { Skeleton } from "@/components/ui/skeleton";

/** Mientras carga la lista de conexiones: la cabecera y unas filas con su ícono (CON-20). */
export default function CargandoConexiones() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando las conexiones">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border-soft bg-surface">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border-soft px-4 py-4 last:border-b-0">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
