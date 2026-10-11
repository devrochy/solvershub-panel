"use client";

import { useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { useEsMac } from "@/components/shell/use-es-mac";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { ATAJOS_IR } from "@/lib/shell/paleta";
import { cn } from "@/lib/utils";

/**
 * Ayuda de atajos (`?`, HU-DS-05). Incluye el interruptor de los atajos de una tecla
 * (WCAG 2.1.4), que también está en Configuración → Accesibilidad y en la paleta.
 */
export function AyudaDeAtajos({
  abierta,
  onAbiertaChange,
  atajosActivos,
  onAtajosChange,
}: {
  abierta: boolean;
  onAbiertaChange: (abierta: boolean) => void;
  atajosActivos: boolean;
  onAtajosChange: (activos: boolean) => void;
}) {
  const esMac = useEsMac();
  const retornoDeFoco = useRef<HTMLElement | null>(null);
  const mod = esMac ? "⌘" : "Ctrl";

  const siempre: { teclas: string[]; accion: string }[] = [
    { teclas: [mod, "K"], accion: "Abrir la paleta de comandos" },
    { teclas: ["Esc"], accion: "Cerrar la paleta, un diálogo o el menú" },
  ];
  const deUnaTecla: { teclas: string[]; accion: string }[] = [
    { teclas: ["/"], accion: "Ir al buscador o filtro de la página" },
    { teclas: ["["], accion: "Plegar o expandir el menú" },
    ...ATAJOS_IR.map((a) => ({ teclas: ["g", a.tecla], accion: `Ir a ${a.label}` })),
    { teclas: ["?"], accion: "Ver esta ayuda" },
  ];

  return (
    <DialogPrimitive.Root open={abierta} onOpenChange={onAbiertaChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <DialogPrimitive.Content
          onOpenAutoFocus={() => {
            const activo = document.activeElement;
            retornoDeFoco.current = activo instanceof HTMLElement ? activo : null;
          }}
          onCloseAutoFocus={(event) => {
            if (retornoDeFoco.current?.isConnected) {
              event.preventDefault();
              retornoDeFoco.current.focus();
            }
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
            "overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-elev-3 focus:outline-none",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="font-display text-lg font-semibold text-headline">
                Atajos de teclado
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sh-dense text-body">
                Cada sección tiene además su propia ayuda, en el botón junto al título.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className="rounded-md p-1 text-text-soft transition-colors hover:bg-hover hover:text-headline"
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <ListaDeAtajos titulo="Siempre disponibles" atajos={siempre} />

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-border-soft pt-4">
            <label htmlFor="atajos-una-tecla" className="text-sh-dense font-medium text-headline">
              Atajos de una tecla
            </label>
            <Switch id="atajos-una-tecla" checked={atajosActivos} onCheckedChange={onAtajosChange} />
          </div>
          <p className="mt-1 text-sh-caption text-text-soft">
            Apágalos si usas un lector de pantalla o dictado por voz y se te disparan sin querer. {mod} K sigue
            funcionando.
          </p>
          <ListaDeAtajos atajos={deUnaTecla} className="mt-3" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ListaDeAtajos({
  titulo,
  atajos,
  className,
}: {
  titulo?: string;
  atajos: { teclas: string[]; accion: string }[];
  className?: string;
}) {
  return (
    <section className={className}>
      {titulo && <h3 className="mb-2 text-sh-dense font-medium text-headline">{titulo}</h3>}
      <dl className="flex flex-col">
        {atajos.map((a) => (
          <div key={a.accion} className="flex items-center justify-between gap-4 py-1.5">
            <dt className="text-sh-dense text-body">{a.accion}</dt>
            <dd>
              <Kbd keys={a.teclas} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
