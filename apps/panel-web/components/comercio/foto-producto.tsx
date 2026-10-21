"use client";

import { useState } from "react";
import { ImageOff, Package } from "lucide-react";

import { esFotoValida } from "@/lib/foto-producto";
import { cn } from "@/lib/utils";

const TAMANO = { sm: "h-10 w-10", lg: "h-28 w-28" } as const;

/** Miniatura de la foto del producto (HU-CRM-01). Sin foto o con un link roto, un ícono. */
export function FotoProducto({
  url,
  nombre,
  size = "sm",
}: {
  url: string | null | undefined;
  nombre: string;
  size?: keyof typeof TAMANO;
}) {
  const [rota, setRota] = useState<string | null>(null);
  const valida = !!url && esFotoValida(url);
  const marco = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-raised text-text-soft",
    TAMANO[size],
  );
  if (!valida || rota === url) {
    const Icono = valida ? ImageOff : Package;
    return (
      <span className={marco} role="img" aria-label={valida ? `No se pudo cargar la foto de ${nombre}` : `${nombre} sin foto`}>
        <Icono className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className={marco}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fotos externas del dueño, sin optimizar */}
      <img
        src={url.trim()}
        alt={`Foto de ${nombre}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
        onError={() => setRota(url)}
      />
    </span>
  );
}
