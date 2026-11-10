import { Skeleton } from "@/components/ui/skeleton";

function Cabecera() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-8 w-56 max-w-full" />
    </div>
  );
}

function Pestanas() {
  return <Skeleton className="h-10 w-96 max-w-full" />;
}

function Filas({ cantidad = 5 }: { cantidad?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-soft bg-surface">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border-soft px-4 py-4 last:border-b-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function Cifras({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: cantidad }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function CargandoResumen() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando Cobranza">
      <Cabecera />
      <Pestanas />
      <Cifras />
      <Filas cantidad={3} />
    </div>
  );
}

export function CargandoLista() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando la lista">
      <Cabecera />
      <Pestanas />
      <Filas />
    </div>
  );
}

/** Dentro de una ficha la cabecera y sus pestañas ya están: solo cambia el contenido. */
export function CargandoContenido() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando">
      <Cifras />
      <Filas cantidad={4} />
    </div>
  );
}

export function CargandoFicha() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando la ficha">
      <Cabecera />
      <Pestanas />
      <Cifras />
      <Filas cantidad={4} />
    </div>
  );
}

export function CargandoCliente() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando la ficha del cliente">
      <Cabecera />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Filas cantidad={3} />
    </div>
  );
}
