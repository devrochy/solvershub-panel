import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { TemaDeAcceso } from "@/components/domain/tema-de-acceso";
import { Marca } from "@/components/ui/marca";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";

/**
 * Marco de las pantallas sin sesión (entrar, definir la contraseña de la invitación y
 * recuperarla): fondo completo, la marca como portada y el formulario en una columna
 * de lectura. El tema se resuelve en el servidor para que el cambio no espere al render.
 */
export async function TarjetaDeAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  const store = await cookies();
  const tema = normalizeTheme(store.get(THEME_COOKIE)?.value);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-5 py-10 sm:px-6">
      <div className="flex w-full max-w-[420px] flex-col">
        <Marca
          pieza="logo-vertical"
          className="mx-auto h-auto w-[184px] sm:w-[208px]"
        />

        <div
          aria-hidden
          className="mx-auto mt-7 h-0.5 w-10 rounded-full [background-image:linear-gradient(90deg,var(--sh-blue-500),var(--sh-cyan-400))]"
        />

        <div className="mt-5 text-center">
          <h1 className="font-display text-sh-block text-headline">{titulo}</h1>
          {descripcion && <p className="mt-1 text-sh-dense text-body">{descripcion}</p>}
        </div>

        <div className="mt-8">{children}</div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-center text-sh-caption text-text-soft sm:text-left">
            Centro de soluciones impulsado con IA
          </p>
          <TemaDeAcceso inicial={tema} />
        </footer>
      </div>
    </main>
  );
}
