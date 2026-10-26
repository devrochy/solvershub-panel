"use client";

import Link from "next/link";
import { Archive } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { NotificacionItem } from "@/lib/api/types";
import { CATEGORIA, SEVERIDAD, categoriaDe, severidadDe, tiempoRelativo } from "@/lib/notificaciones/tipos";
import { cn } from "@/lib/utils";

/**
 * Una notificación: icono de **categoría** sobre el color de la **severidad** (siempre con
 * texto: la categoría y, si es urgente, su etiqueta). El área principal marca leída y navega;
 * archivar es un botón aparte (nada de controles anidados).
 */
export function FilaNotificacion({
  item,
  href,
  ahora,
  nueva = false,
  onAbrir,
  onArchivar,
}: {
  item: NotificacionItem;
  /** Ruta de destino visible para este usuario, o `null` si no tiene a dónde ir. */
  href: string | null;
  ahora: Date;
  /** Llegó después de abrir el centro: entra con un fade corto. */
  nueva?: boolean;
  onAbrir: (item: NotificacionItem) => void;
  onArchivar: (item: NotificacionItem) => void;
}) {
  const cat = CATEGORIA[categoriaDe(item.category)];
  const sev = SEVERIDAD[severidadDe(item.severity)];
  const Icono = cat.icon;
  const urgente = item.severity === "warning" || item.severity === "critical";

  const contenido = (
    <>
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border",
          sev.fondo,
          sev.texto,
          sev.borde,
        )}
      >
        <Icono className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn("min-w-0 flex-1 text-sm leading-5 text-headline", !item.read && "font-semibold")}
          >
            {item.title}
          </span>
          {!item.read && (
            <>
              <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-focus" />
              <span className="sr-only">No leída</span>
            </>
          )}
        </span>
        {item.body && <span className="mt-0.5 line-clamp-2 block text-sm leading-5 text-body">{item.body}</span>}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-soft">
          <span>{cat.label}</span>
          <span aria-hidden>·</span>
          <time dateTime={item.created_at}>{tiempoRelativo(item.created_at, ahora)}</time>
          {urgente && (
            <Badge variant={sev.tono} icon={<sev.icon aria-hidden className="h-3 w-3" />}>
              {sev.label}
            </Badge>
          )}
        </span>
      </span>
    </>
  );

  const claseArea =
    "flex min-w-0 flex-1 items-start gap-3 rounded-md p-3 text-left focus-visible:outline-2 focus-visible:outline-focus";

  return (
    <li
      className={cn(
        "group relative flex items-start rounded-md transition-colors hover:bg-hover",
        !item.read && "bg-focus/5",
        nueva && "sh-notif-fila-nueva",
      )}
      data-categoria={item.category}
      data-severidad={item.severity}
    >
      {href ? (
        <Link href={href} className={claseArea} onClick={() => onAbrir(item)}>
          {contenido}
        </Link>
      ) : (
        <button type="button" className={claseArea} onClick={() => onAbrir(item)}>
          {contenido}
        </button>
      )}
      <button
        type="button"
        aria-label={`Archivar: ${item.title}`}
        title="Archivar"
        onClick={() => onArchivar(item)}
        className="mr-2 mt-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-soft transition-colors hover:bg-hover hover:text-headline focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Archive className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}
