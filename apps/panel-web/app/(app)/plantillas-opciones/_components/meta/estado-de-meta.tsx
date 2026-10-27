import { Badge } from "@/components/ui/badge";
import { categoriaEtiqueta, type EstadoDeVersion } from "@/lib/plantillas-opciones-meta";

/**
 * Qué dice Meta de la plantilla de una versión: insignia con ícono (el color nunca va solo), una frase en
 * lenguaje del dueño, el motivo de rechazo o del último error y, si Meta cambió la categoría, el cambio.
 */
export function EstadoDeMeta({ estado, categoria }: { estado: EstadoDeVersion; categoria?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={estado.insignia.tono === "neutral" ? "neutral" : estado.insignia.tono}>{estado.insignia.etiqueta}</Badge>
        {categoria && <span className="text-xs text-text-soft">Categoría: {categoriaEtiqueta(categoria)}</span>}
      </div>
      <p className="text-body">{estado.explicacion}</p>
      {estado.motivo && (
        <p className="text-xs text-body">
          <span className="font-medium text-headline">Motivo: </span>
          {estado.motivo}
        </p>
      )}
      {estado.recomendacion && (
        <p className="text-xs text-body">
          <span className="font-medium text-headline">Recomendación de Meta: </span>
          {estado.recomendacion}
        </p>
      )}
      {estado.categoriaCambiada && (
        <p role="status" className="text-xs text-status-warning-fg">
          Meta cambió la categoría de {categoriaEtiqueta(estado.categoriaCambiada.de)} a {categoriaEtiqueta(estado.categoriaCambiada.a)}: el cobro
          cambia con ella.
        </p>
      )}
      {estado.siguiente && <p className="text-xs text-text-soft">{estado.siguiente}</p>}
    </div>
  );
}
