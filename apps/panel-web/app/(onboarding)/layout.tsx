import type { ReactNode } from "react";

import { FeedbackProviders } from "@/components/ui/providers";

/** Asistente de primer uso: pantalla completa, fuera del shell (sin menú, para que se termine o se salte con intención). */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <FeedbackProviders>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-headline focus:shadow-elev-2"
      >
        Saltar al contenido
      </a>
      {children}
    </FeedbackProviders>
  );
}
