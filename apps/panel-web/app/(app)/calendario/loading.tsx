import { Skeleton } from "@/components/ui/skeleton";

/** Mientras carga la Agenda: la cabecera, la columna de hoy y la forma de la semana (AGE-13). */
export default function CargandoAgenda() {
  return (
    <div role="status" className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando la Agenda">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Skeleton className="h-96 w-full rounded-lg max-lg:hidden" />
        <div className="flex flex-col gap-3">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-9 w-48" />
          </div>
          <div className="grid h-[28rem] grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-full w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
