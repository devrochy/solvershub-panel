import type { ReactNode } from "react";

import { Marca } from "@/components/ui/marca";

/**
 * Marco de las pantallas sin sesión (entrar, definir la contraseña de la invitación y
 * recuperarla): logo, un título (el único `h1`) y el formulario.
 */
export function TarjetaDeAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-lg border border-border-soft bg-surface p-8">
        <Marca pieza="logo" className="mx-auto mb-2 h-9 w-auto" />
        <p className="mb-8 text-center text-sm text-body">Centro de soluciones</p>
        <h1 className="font-display text-lg font-semibold text-headline">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-body">{descripcion}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
