import { Skeleton } from "@/components/ui/skeleton";

/** Al cambiar de pestaña la cabecera de la ficha ya está: solo carga el contenido (CON-20). */
export default function CargandoPestana() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  );
}
