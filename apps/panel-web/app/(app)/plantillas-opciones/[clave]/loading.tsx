import { Skeleton } from "@/components/ui/skeleton";

/** Mientras carga una plantilla: la cabecera, el mensaje, las opciones plegadas y la vista previa (PLA-12). */
export default function CargandoPlantilla() {
  return (
    <div role="status" className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando la plantilla">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-10 w-56" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg max-lg:hidden" />
      </div>
    </div>
  );
}
