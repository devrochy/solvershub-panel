"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Vuelve a pedir los datos de la página sin perder la cabecera ni los filtros. */
export function BotonReintentar() {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  return (
    <Button type="button" loading={pendiente} onClick={() => startTransition(() => router.refresh())}>
      Reintentar
    </Button>
  );
}

function DetalleTecnico({ detalle }: { detalle: string }) {
  return (
    <details className="text-xs text-text-soft">
      <summary className="cursor-pointer rounded-sm focus-visible:outline-2">Detalle técnico</summary>
      <code className="mt-1 block break-words font-mono">{detalle}</code>
    </details>
  );
}

/**
 * Cuando algo no carga: qué pasó, cómo seguir y una acción; el error técnico va plegado.
 * `forma="pagina"` va centrado debajo de la cabecera y `forma="en-linea"` es una banda.
 * Con `tono="neutro"` no es una falla sino algo que no está (un enlace viejo).
 */
export function EstadoDeError({
  titulo,
  descripcion,
  accion,
  detalle,
  icono,
  forma = "pagina",
  tono = "error",
  className,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  detalle?: string;
  icono?: ReactNode;
  forma?: "pagina" | "en-linea";
  tono?: "error" | "neutro";
  className?: string;
}) {
  const simbolo = icono ?? <AlertCircle aria-hidden className={forma === "pagina" ? "h-5 w-5" : "h-4 w-4"} />;

  if (forma === "en-linea") {
    return (
      <div
        role="alert"
        className={cn(
          "flex items-center gap-3 rounded-md border border-status-danger-border bg-status-danger-bg px-4 py-3.5",
          className,
        )}
      >
        <span className="shrink-0 text-status-danger-fg">{simbolo}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-headline">{titulo}</p>
          {descripcion && <p className="mt-0.5 text-sh-label font-normal text-body">{descripcion}</p>}
          {detalle && <DetalleTecnico detalle={detalle} />}
        </div>
        {accion}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-2.5 px-6 py-8 text-center", className)}
    >
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          tono === "error" ? "bg-status-danger-bg text-status-danger-fg" : "bg-surface-2 text-text-soft",
        )}
      >
        {simbolo}
      </span>
      <p className="font-display text-sh-block text-headline">{titulo}</p>
      {descripcion && <p className="max-w-sm text-sm text-body">{descripcion}</p>}
      {accion}
      {detalle && <DetalleTecnico detalle={detalle} />}
    </div>
  );
}
