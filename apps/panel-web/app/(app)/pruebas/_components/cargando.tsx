import { Skeleton } from "@/components/ui/skeleton";

function Filas({ cuantas }: { cuantas: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-soft">
      {Array.from({ length: cuantas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-border-soft px-4 py-3.5 first:border-t-0">
          <Skeleton className="h-3 w-3 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-48 max-w-full" />
            <Skeleton className="h-2.5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Ejecutar mientras carga (PRU-12): el avance, la lista y la prueba. */
export function CargandoEjecutar() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando las pruebas" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border-soft p-5">
        <Skeleton className="h-5 w-72 max-w-full" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <Filas cuantas={6} />
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-border-soft p-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-7 w-96 max-w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-80 max-w-full" />
        </div>
      </div>
    </div>
  );
}

/** Las demás pestañas de Pruebas mientras cargan: filas con la forma de su lista. */
export function CargandoLista({ que }: { que: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Cargando ${que}`} className="flex flex-col gap-4">
      <Skeleton className="h-3 w-56 max-w-full" />
      <Filas cuantas={4} />
    </div>
  );
}
