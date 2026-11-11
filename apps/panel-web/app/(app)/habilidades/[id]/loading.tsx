import { Skeleton } from "@/components/ui/skeleton";

/** Mientras cargan los ajustes de una habilidad (CFG-09). */
export default function CargandoHabilidad() {
  return (
    <div role="status" className="flex max-w-2xl flex-col gap-6" aria-busy="true" aria-label="Cargando los ajustes de la habilidad">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}
