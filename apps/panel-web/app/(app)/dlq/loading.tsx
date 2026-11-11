import { Skeleton } from "@/components/ui/skeleton";

/** Mientras cargan los mensajes fallidos: la cabecera y las dos listas (CFG-09). */
export default function CargandoFallidos() {
  return (
    <div role="status" className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando los mensajes fallidos">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
