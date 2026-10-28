import { TriangleAlert } from "lucide-react";

import { MAX_BOTON_META, MAX_BOTONES_META, type ResumenDeComponentes } from "@/lib/plantillas-opciones-meta";
import { cn } from "@/lib/utils";

/**
 * Los componentes que se mandarían a Meta: cuerpo, pie y botones de respuesta rápida, con el conteo contra los
 * topes (25 caracteres por botón y 10 botones). El backend vuelve a validarlos antes de llamar a Meta.
 */
export function VistaPreviaMeta({ resumen, cuerpoRenderizado }: { resumen: ResumenDeComponentes; cuerpoRenderizado?: string }) {
  const excedido = resumen.excedeBotones || resumen.botones.some((b) => b.excede);
  return (
    <div className="flex flex-col gap-2" aria-label="Vista previa de la plantilla de Meta" role="group">
      <div className="max-w-sm rounded-lg rounded-tl-sm border border-border-soft bg-surface p-3 text-sm text-headline shadow-elev-1">
        <p className="whitespace-pre-wrap break-words">{cuerpoRenderizado || resumen.cuerpo}</p>
        {resumen.pie && <p className="mt-2 text-xs text-text-soft">{resumen.pie}</p>}
      </div>
      <ul className="flex max-w-sm flex-col gap-1" aria-label="Botones de la plantilla">
        {resumen.botones.map((b, i) => (
          <li
            key={i}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2 text-sm",
              b.excede ? "border-status-danger-fg text-status-danger-fg" : "border-border-soft text-link",
            )}
          >
            <span className="break-words">{b.texto}</span>
            <span className="shrink-0 text-xs tabular-nums text-text-soft">
              {b.largo}/{MAX_BOTON_META}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-soft">
        {resumen.botones.length} {resumen.botones.length === 1 ? "botón" : "botones"} de respuesta rápida (hasta {MAX_BOTONES_META}, de {MAX_BOTON_META}{" "}
        caracteres cada uno).
      </p>
      {excedido && (
        <p role="alert" className="flex items-start gap-1 text-xs text-status-danger-fg">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          Esta plantilla supera los topes de Meta: corrige las opciones y publica una versión nueva.
        </p>
      )}
    </div>
  );
}
