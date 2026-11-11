import { Skeleton } from "@/components/ui/skeleton";

/** Mientras cargan las habilidades: la cabecera y la forma de las tarjetas (CFG-09). */
export default function CargandoHabilidades() {
  return (
    <div role="status" className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando las habilidades">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
