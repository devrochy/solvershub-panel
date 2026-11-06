import Link from "next/link";

import { ChatPrueba } from "@/app/(app)/asistente/_components/chat-prueba";
import { Button } from "@/components/ui/button";
import { TabLinks } from "@/components/ui/tab-links";
import type { ConexionDelAgente } from "@/lib/agentes-ficha";

/**
 * Pestaña Probar de la ficha del agente (HU-UX-09): el chat de prueba (`/asistente`) por una
 * conexión donde está el agente. El playground prueba la versión ACTIVA de esa conexión y es su
 * Coordinador quien elige qué agente responde, igual que con un cliente: el borrador no entra.
 */
export function ProbarAgente({
  nombre,
  conexion,
  opciones,
  asignarHref,
}: {
  nombre: string;
  conexion: ConexionDelAgente | null;
  /** Una opción por conexión del agente (enlace que cambia la conexión de la prueba). */
  opciones: { id: string; label: string; href: string }[];
  asignarHref: string | null;
}) {
  if (!conexion) {
    return (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-fg"
      >
        <p>
          Para probar a {nombre} tiene que estar en una conexión: la prueba corre por la conexión, como con un cliente
          real.
        </p>
        {asignarHref && (
          <div>
            <Button asChild variant="accent">
              <Link href={asignarHref}>Asignar a una conexión</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }
  const actual = opciones.find((o) => o.id === conexion.id);
  return (
    <section aria-labelledby="probar-agente-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="probar-agente-titulo" className="font-display text-sh-block text-headline">
          Probar en {conexion.label}
        </h2>
        <p className="max-w-2xl text-sm text-body">
          Escribe como lo haría un cliente. Responde la versión activa de esta conexión y el Coordinador decide qué agente
          contesta; lo que tengas sin publicar no entra en la prueba. No se envía nada por el canal.
        </p>
      </div>
      {opciones.length > 1 && actual && (
        <TabLinks label="Conexión de la prueba" current={actual.href} items={opciones.map((o) => ({ label: o.label, href: o.href }))} />
      )}
      {!conexion.atiende && (
        <p role="status" className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
          {nombre} no está atendiendo en esta conexión ({conexion.estado.label.toLowerCase()}): la prueba la responde otro
          agente.
        </p>
      )}
      {conexion.atiende && conexion.version === null && (
        <p role="status" className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
          {nombre} todavía no está en la versión activa de esta conexión: actívala para que entre en la prueba.
        </p>
      )}
      <ChatPrueba key={conexion.id} conexionId={conexion.id} />
    </section>
  );
}
