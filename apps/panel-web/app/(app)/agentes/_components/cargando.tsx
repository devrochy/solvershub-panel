import { Skeleton } from "@/components/ui/skeleton";

/** Cabecera de una pantalla de Agentes mientras carga: título, una línea y una acción. */
function Cabecera({ conPestanas = false }: { conPestanas?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      {conPestanas && (
        <>
          <Skeleton className="h-3 w-96 max-w-full" />
          <div className="flex gap-6 border-b border-border-soft pb-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-24" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Filas({ cuantas = 5 }: { cuantas?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-soft">
      {Array.from({ length: cuantas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-border-soft px-4 py-3.5 first:border-t-0">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-56 max-w-full" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** La lista de agentes mientras carga (AGT-15): la forma de las tarjetas. */
export function CargandoLista() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando tus agentes" className="flex flex-col gap-6">
      <Cabecera />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-border-soft p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** La ficha de un agente mientras carga: cabecera, pestañas y filas. */
export function CargandoFicha() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando el agente" className="flex flex-col gap-6">
      <Cabecera conPestanas />
      <Filas />
    </div>
  );
}

/** Calidad, Colaboración o el editor mientras cargan: cabecera y filas. */
export function CargandoVista({ que }: { que: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Cargando ${que}`} className="flex flex-col gap-6">
      <Cabecera />
      <Filas cuantas={4} />
    </div>
  );
}
