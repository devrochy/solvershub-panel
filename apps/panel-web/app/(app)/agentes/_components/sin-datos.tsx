import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Estado vacío de una pestaña del agente: explica qué va a aparecer y cómo probarlo (el chat
 * web de su conexión), en vez de una tabla en blanco.
 */
export function SinDatos({ que, nombre }: { que: string; nombre: string }) {
  return (
    <EmptyState
      title={`Todavía no hay ${que} de ${nombre}`}
      description={`Aparecerán aquí en cuanto ${nombre} atienda a un cliente. Para probarlo, escríbele desde el chat web de tu conexión: cada mensaje que responda suma a esta vista.`}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/configuracion?tab=web-chat">Abrir el chat web</Link>
        </Button>
      }
    />
  );
}
