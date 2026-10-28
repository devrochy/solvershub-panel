"use client";

import { BotonDeMensaje, BurbujaDeMensaje } from "@/components/domain/mensaje-interactivo";
import type { InteractivoLeido } from "@/lib/playground-opciones";

/**
 * Un mensaje del sistema con botones (≤3) o lista (4–10) en el chat de prueba: el mismo aspecto que la vista previa
 * del editor, pero los botones se tocan. `tocados` son los ids ya usados: cada uno ejecuta una sola vez, así que
 * quedan marcados y no se pueden volver a tocar.
 */
export function MensajeConBotones({
  interactivo,
  tocados,
  ocupado,
  onTocar,
}: {
  interactivo: InteractivoLeido;
  tocados: ReadonlySet<string>;
  ocupado: boolean;
  onTocar: (id: string, titulo: string) => void;
}) {
  const lista = interactivo.tipo === "lista";
  const opciones = interactivo.opciones.map((o) => {
    const usado = tocados.has(o.id);
    return (
      <BotonDeMensaje key={o.id} disabled={ocupado || usado} onClick={() => onTocar(o.id, o.titulo)}>
        {usado ? `${o.titulo} ✓` : o.titulo}
      </BotonDeMensaje>
    );
  });
  return (
    <div className="flex max-w-[80%] flex-col items-start">
      <BurbujaDeMensaje className="max-w-full">
        <p className="whitespace-pre-wrap break-words">{interactivo.cuerpo}</p>
        {interactivo.pie && <p className="mt-2 text-xs text-text-soft">{interactivo.pie}</p>}
      </BurbujaDeMensaje>
      {lista ? (
        <div role="group" aria-label={interactivo.boton ?? "Opciones de la lista"} className="flex flex-col items-start">
          {interactivo.boton && <p className="mt-1.5 text-xs text-text-soft">{interactivo.boton}</p>}
          {opciones}
        </div>
      ) : (
        <div role="group" aria-label="Botones del mensaje" className="flex flex-col items-start">
          {opciones}
        </div>
      )}
    </div>
  );
}
