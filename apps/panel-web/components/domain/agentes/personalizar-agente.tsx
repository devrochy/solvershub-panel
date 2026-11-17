"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Sparkles, X } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { Button } from "@/components/ui/button";
import { claveDeNovedad, useNovedad } from "@/lib/novedad";
import { rutaDePersonalizar } from "@/lib/rutas-de-agente";

const TEXTO_NOVEDAD = "Nuevo: personaliza tu agente aquí";
const DETALLE =
  "Ajusta cómo habla, lo que sabe, sus formas de pago y su guion. Los cambios quedan en borrador hasta que publiques.";

/**
 * Acción principal de la ficha (SPEC-47, HU-AOS-80, D-SPEC-47-3): «Personalizar» con punto de
 * novedad. La primera vez que se enfoca o se señala abre una explicación corta; al cerrarla, o al
 * entrar a Personalizar, deja de mostrarse para este usuario y este agente.
 */
export function BotonPersonalizar({ agenteId, usuarioId }: { agenteId: string; usuarioId: string }) {
  const [pendiente, descartar] = useNovedad(claveDeNovedad("personalizar", usuarioId, agenteId));
  const [abierto, setAbierto] = useState(false);
  const [mostrado, setMostrado] = useState(false);
  const idNovedad = useId();

  function mostrarUnaVez() {
    if (!pendiente || mostrado) return;
    setMostrado(true);
    setAbierto(true);
  }

  return (
    <PopoverPrimitive.Root
      open={pendiente && abierto}
      onOpenChange={(abrir) => {
        setAbierto(abrir);
        if (!abrir) descartar();
      }}
    >
      <PopoverPrimitive.Anchor asChild>
        <Button asChild variant="accent" className="relative">
          <Link
            href={rutaDePersonalizar(agenteId)}
            aria-describedby={pendiente ? idNovedad : undefined}
            onFocus={mostrarUnaVez}
            onMouseEnter={mostrarUnaVez}
            onClick={descartar}
          >
            Personalizar
            {pendiente && (
              // El punto no es el único portador: `aria-describedby` dice «Nuevo».
              <span
                aria-hidden="true"
                data-testid="punto-de-novedad"
                className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-surface bg-focus"
              />
            )}
          </Link>
        </Button>
      </PopoverPrimitive.Anchor>
      {pendiente && (
        <span id={idNovedad} className="sr-only">
          {TEXTO_NOVEDAD}
        </span>
      )}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          aria-label={TEXTO_NOVEDAD}
          side="bottom"
          align="end"
          sideOffset={8}
          // Sin auto-foco: el foco se queda en el botón que el dueño eligió.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="pointer-events-auto z-[60] w-72 rounded-md border border-border bg-surface p-4 text-sm text-headline shadow-elev-2 focus:outline-none"
        >
          <p className="font-medium">{TEXTO_NOVEDAD}</p>
          <p className="mt-1 text-soft">{DETALLE}</p>
          <PopoverPrimitive.Close asChild>
            <Button size="sm" variant="outline" className="mt-3 min-h-11">
              Entendido
            </Button>
          </PopoverPrimitive.Close>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/** Banner de primera visita a la ficha: dice qué cambió y se descarta para siempre. */
export function BannerPersonalizar({ agenteId, usuarioId, nombre }: { agenteId: string; usuarioId: string; nombre: string }) {
  const [pendiente, descartar] = useNovedad(claveDeNovedad("personalizar", usuarioId, agenteId));
  if (!pendiente) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-status-info-border bg-status-info-bg p-4 text-sm"
    >
      <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-status-info-fg" />
      <p className="flex-1 text-headline">
        <span className="font-medium">«Editar» ahora se llama «Personalizar».</span>{" "}
        <span className="text-body">
          Ahí ajustas cómo habla {nombre}, lo que sabe, cómo cobra y su guion.
        </span>{" "}
        <Link className="text-link underline underline-offset-2" href={rutaDePersonalizar(agenteId)} onClick={descartar}>
          Personalizar {nombre}
        </Link>
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 shrink-0"
        aria-label="Descartar el aviso de Personalizar"
        onClick={descartar}
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
