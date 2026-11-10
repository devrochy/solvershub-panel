import { BotonReintentar, EstadoDeError } from "@/components/ui/estado-de-error";

/** Una pantalla que no cargó: la cabecera sigue en pie y se puede reintentar. */
export function ErrorDeCarga({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="rounded-lg border border-border-soft bg-surface">
      <EstadoDeError
        titulo={titulo}
        descripcion="Revisa tu conexión y vuelve a intentarlo. Si sigue pasando, avísanos."
        detalle={detalle}
        accion={<BotonReintentar />}
      />
    </div>
  );
}
