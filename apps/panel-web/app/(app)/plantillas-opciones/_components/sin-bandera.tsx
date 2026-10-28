import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * La función no está activada para el negocio (la API responde 404 `opciones_directas_no_habilitadas`).
 * No es un error: explica qué es, quién la activa y a dónde volver (HU-OPC-06, «bandera apagada»).
 * Al master (`enlaceActivar`, PR 10b) le ofrece ir directo al interruptor del negocio actual; el resto
 * lee el mismo mensaje de siempre.
 */
export function SinBandera({ enlaceActivar }: { enlaceActivar?: string | null }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-text-soft" aria-hidden>
          <Lock className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-headline">Las plantillas con opciones no están activadas en tu negocio</p>
        <p className="max-w-md text-sm text-text-soft">
          Te permiten enviar un mensaje con botones que ejecutan una acción al tocarlos, sin esperar a que el asistente responda. Las activa el equipo de
          SolversHub negocio por negocio: pídele a tu contacto de SolversHub que la habilite y vuelve a entrar aquí.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {enlaceActivar && (
            <Button asChild size="sm">
              <Link href={enlaceActivar}>Ir al interruptor de este negocio</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/plantillas">Volver a Plantillas de WhatsApp</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
