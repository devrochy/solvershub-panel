import { CheckCircle2, CircleAlert, CircleX } from "lucide-react";

import type { Semaforo } from "@/lib/listo-para-responder";
import { cn } from "@/lib/utils";

const ESTILO = {
  verde: { icono: CheckCircle2, caja: "border-status-success-border bg-status-success-bg", texto: "text-status-success-fg" },
  ambar: { icono: CircleAlert, caja: "border-status-warning-border bg-status-warning-bg", texto: "text-status-warning-fg" },
  rojo: { icono: CircleX, caja: "border-status-danger-border bg-status-danger-bg", texto: "text-status-danger-fg" },
} as const;

/** «Listo para responder» (HU-AOS-81): la luz con su ícono y su frase (nunca solo color) y lo que falta. */
export function SemaforoListo({ semaforo }: { semaforo: Semaforo }) {
  const e = ESTILO[semaforo.luz];
  const Icono = e.icono;
  return (
    <section aria-labelledby="semaforo-listo" className={cn("flex flex-col gap-2 rounded-md border p-4", e.caja)} data-luz={semaforo.luz}>
      <h3 id="semaforo-listo" className={cn("flex items-center gap-2 text-sm font-medium", e.texto)}>
        <Icono aria-hidden="true" className="size-4 shrink-0" />
        {semaforo.titulo}
      </h3>
      {semaforo.pendientes.length > 0 && (
        <ul className="list-disc pl-6 text-sm text-body">
          {semaforo.pendientes.map((p) => (
            <li key={p.texto}>{p.texto}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
