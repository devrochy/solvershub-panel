import { Skeleton } from "@/components/ui/skeleton";

/** Carga con la forma de la bandeja (lista y panel del chat): el layout no salta al llegar los datos. */
export default function CargandoConversaciones() {
  return (
    <div
      data-ancho-completo
      className="flex min-h-0 flex-1 flex-col gap-4"
      aria-busy="true"
      aria-label="Cargando las conversaciones"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-72 max-w-full" />
      </div>
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-border-soft bg-surface lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 border-border-soft p-3 lg:border-r">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-3 px-1">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <Skeleton lines={2} className="flex-1" />
            </div>
          ))}
        </div>
        <div className="hidden lg:block" />
      </div>
    </div>
  );
}
