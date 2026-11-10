import Link from "next/link";
import { UserRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Contador } from "@/components/ui/contador";
import type { EscalationItem } from "@/lib/api/types";
import { nombreDelChat } from "@/lib/conversaciones/nombre";
import { tiempoRelativo } from "@/lib/notificaciones/tipos";
import { cn } from "@/lib/utils";

const MAXIMO = 4;

/**
 * Quién espera a una persona del equipo, por qué y hace cuánto: lo único del Resumen que pide
 * una acción. Sin nadie esperando se queda callada en el celular, donde iría antes que todo.
 */
export function TeEsperan({
  escalaciones,
  total,
  ahora,
  className,
}: {
  escalaciones: EscalationItem[];
  total: number;
  ahora?: Date;
  className?: string;
}) {
  return (
    <Card className={cn(total === 0 && "max-xl:hidden", className)}>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle as="h2">Te esperan</CardTitle>
          {total > 0 && <Contador valor={total} tono="alerta" etiqueta={total === 1 ? "1 persona" : `${total} personas`} />}
        </div>
        {total > 0 && (
          <Link href="/escalaciones?estado=pendiente" className="text-sm text-link hover:underline">
            Ver todas
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-text-soft">Nadie te espera por ahora.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft text-sm">
            {escalaciones.slice(0, MAXIMO).map((esc) => {
              const nombre = nombreDelChat(esc);
              return (
                <li key={esc.conversation_id}>
                  <Link
                    href={`/conversaciones?c=${esc.conversation_id}`}
                    className="-mx-2 flex min-h-11 items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-hover"
                  >
                    {esc.customer_name ? (
                      <Avatar name={nombre} size="sm" />
                    ) : (
                      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hover text-text-soft">
                        <UserRound className="h-4 w-4" />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-headline">{nombre}</span>
                      <span className="truncate text-xs text-text-soft">{esc.summary || esc.reason_label}</span>
                    </span>
                    <time dateTime={esc.created_at} className="shrink-0 text-xs text-text-soft" suppressHydrationWarning>
                      {tiempoRelativo(esc.created_at, ahora)}
                    </time>
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
