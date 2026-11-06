import Link from "next/link";

import { ChannelIcon } from "@/components/domain/channel-icon";
import { CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dashboard } from "@/lib/api/types";
import { nombreDelChat } from "@/lib/conversaciones/nombre";
import { tiempoRelativo } from "@/lib/notificaciones/tipos";

type Reciente = Dashboard["recent"][number];

/**
 * Las últimas conversaciones del negocio: quién, por qué canal, cuándo empezó y en qué estado.
 * Quien dio su nombre lleva sus iniciales; un visitante anónimo, el ícono de su canal. `started_at`
 * y `channel` son opcionales (un servidor viejo no los manda): sin ellos la fila sigue sirviendo.
 */
export function ConversacionesRecientes({ recientes, ahora }: { recientes: Reciente[]; ahora?: Date }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Conversaciones recientes</CardTitle>
        <Link href="/conversaciones" className="text-sm text-link hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent>
        {recientes.length === 0 ? (
          <p className="text-sm text-text-soft">Aún no hay conversaciones.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft text-sm">
            {recientes.map((conv) => {
              const nombre = nombreDelChat(conv);
              return (
                <li key={conv.id}>
                  <Link
                    href={`/conversaciones/${encodeURIComponent(conv.id)}`}
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-hover"
                  >
                    {conv.customer_name ? <Avatar name={nombre} size="sm" /> : <ChannelIcon id={conv.channel} />}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-headline">{nombre}</span>
                      {conv.started_at && (
                        <time dateTime={conv.started_at} className="text-xs text-text-soft">
                          {tiempoRelativo(conv.started_at, ahora)}
                        </time>
                      )}
                    </span>
                    <StatusBadge value={conv.status} map={CONVERSATION_STATUS} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
