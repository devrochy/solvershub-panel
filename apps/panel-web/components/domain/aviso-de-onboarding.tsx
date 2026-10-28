import Link from "next/link";
import { Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { accionDelAviso, textoDelAviso, type Recorrido } from "@/lib/onboarding";

/**
 * Aviso permanente del asistente de primer uso (HU-UX-21): se ve en todas las pantallas del panel mientras el
 * recorrido esté empezado o saltado. No se puede cerrar: desaparece solo cuando el servidor da el recorrido
 * por completo. Va entre el contenido y el menú, con el mismo tono de las alertas de configuración pendiente.
 */
export function AvisoDeOnboarding({ recorrido }: { recorrido: Recorrido | null | undefined }) {
  if (!recorrido?.aplica || !recorrido.avisar) return null;
  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-4"
    >
      <Rocket className="h-5 w-5 shrink-0 text-status-warning-fg" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-headline">{textoDelAviso(recorrido)}</p>
        <p className="text-sm text-body">Termina la configuración inicial para probarlo y empezar a operar.</p>
      </div>
      <Button asChild size="sm" variant="accent">
        <Link href="/bienvenida">{accionDelAviso(recorrido)}</Link>
      </Button>
    </div>
  );
}
