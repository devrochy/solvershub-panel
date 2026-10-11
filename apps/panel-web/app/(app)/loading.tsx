import { Skeleton } from "@/components/ui/skeleton";

/**
 * Carga por defecto de las páginas del panel (HU-UI-03): la forma de una página de lista
 * (cabecera, filtros y tabla) mientras llegan los datos. Las páginas con forma propia
 * (como el Resumen) definen su `loading.tsx`.
 */
export default function CargandoPagina() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando la página">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-10 w-72 max-w-full" />
      <div className="overflow-hidden rounded-lg border border-border-soft bg-surface">
        <div className="border-b border-border-soft bg-surface-2/60 px-4 py-3">
          <Skeleton className="h-3 w-1/3" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border-soft px-4 py-4 last:border-b-0">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-1/5" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
