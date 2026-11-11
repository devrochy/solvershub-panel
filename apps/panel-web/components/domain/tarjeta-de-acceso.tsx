import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { ChannelIcon } from "@/components/domain/channel-icon";
import { TemaDeAcceso } from "@/components/domain/tema-de-acceso";
import { Marca } from "@/components/ui/marca";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";

/** Los canales por los que atiende el agente, en la portada del acceso (solo en escritorio). */
const CANALES = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "messenger", label: "Messenger" },
  { id: "webchat", label: "Chat web" },
];

/**
 * Marco de las pantallas sin sesión (entrar, definir la contraseña de la invitación y recuperarla).
 * Rediseño D (ACP-01, ACP-03): en escritorio, la marca a la izquierda —el logo vertical centrado con su
 * presentación, la promesa y los canales— y el formulario de siempre a la derecha. En el celular, el
 * logo y la promesa arriba, centrados, sin los canales. El tema se resuelve en el servidor para que el
 * cambio no espere al render.
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
    <main className="flex min-h-dvh flex-col justify-center gap-8 bg-bg py-10 lg:grid lg:grid-cols-2 lg:gap-0 lg:py-0">
      <section
        aria-label="SolversHub"
        className="flex flex-col items-center justify-center gap-4 px-6 text-center lg:gap-10 lg:border-r lg:border-border-soft lg:bg-surface lg:px-16 lg:py-16"
      >
        <Marca pieza="logo-vertical" className="sh-acceso-logo h-auto w-[150px] lg:w-[240px]" />
        <div className="sh-acceso-sube flex max-w-[460px] flex-col gap-3">
          <p className="font-display text-xl font-semibold text-headline lg:text-sh-hero lg:leading-tight">
            Tu agente atiende, vende, cobra y agenda por WhatsApp.
          </p>
          <p className="hidden text-base text-body lg:block">Desde aquí ves cómo va y lo ajustas.</p>
        </div>
        <div className="hidden flex-col items-center gap-3 lg:flex">
          <p className="sh-acceso-sube text-sh-caption text-text-soft" style={{ animationDelay: "800ms" }}>
            Atiende por
          </p>
          <ul className="flex items-start gap-5">
            {CANALES.map((c, i) => (
              <li
                key={c.id}
                className="sh-acceso-sube flex flex-col items-center gap-2"
                style={{ animationDelay: `${900 + i * 90}ms` }}
              >
                <ChannelIcon id={c.id} size="lg" />
                <span className="text-sh-caption text-text-soft">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="flex flex-col items-center justify-center px-5 sm:px-6 lg:py-10">
        <div className="flex w-full max-w-[420px] flex-col">
          <div className="text-center">
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
      </div>
    </main>
  );
}
