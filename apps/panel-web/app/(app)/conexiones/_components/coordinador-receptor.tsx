import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { components } from "@/lib/api/schema";
import { TEXTO_ATIENDE_COORDINADOR } from "@/lib/conexiones";

type Posibles = components["schemas"]["AgentPosibles"];

/**
 * Conexión sin especialistas (HU-AOS-95, D-78): la atiende el Coordinador, que recibe y capta leads.
 * Muestra sus habilidades fijas en solo lectura (`/posibles` del Coordinador) y el camino a «Crear agente
 * especialista». Si `/posibles` falla no rompe la ficha: queda el estado y la acción.
 */
export function CoordinadorReceptor({ posibles, puedeCrear }: { posibles: Posibles | null; puedeCrear: boolean }) {
  const habilidad = posibles?.specialty ?? null;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle as="h3">{TEXTO_ATIENDE_COORDINADOR}</CardTitle>
          {puedeCrear && (
            <Button asChild variant="accent">
              <Link href="/agentes/nuevo">Crear agente especialista</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-body">
          Mientras no haya un especialista, el Coordinador contesta, pide los datos del cliente y los guarda como lead.
          Cuando asignes uno, él atiende y el Coordinador sigue de recepción.
        </p>
        {habilidad && (
          <section aria-label="Habilidades del Coordinador" className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-headline">Habilidades fijas</h4>
            <div className="flex flex-col gap-1 rounded-md border border-border-soft p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-headline">{habilidad.name}</span>
                <Badge variant="neutral">Fija</Badge>
              </div>
              {habilidad.description && <p className="text-xs text-text-soft">{habilidad.description}</p>}
              {habilidad.tools.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {habilidad.tools.map((t) => (
                    <li key={t.name} title={t.description} className="rounded-md bg-surface px-2 py-0.5 text-xs text-body">
                      {t.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
