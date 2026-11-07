"use client";

import type { ReactNode } from "react";

import { ConfirmProvider } from "@/components/ui/confirm";
import { Toaster } from "@/components/ui/toaster";
import { ValidacionEnEspanol } from "@/components/ui/validacion-en-espanol";

/** Proveedores globales de feedback (HU-UI-02): confirmaciones, toasts y validación nativa en español (HU-UX-13). */
export function FeedbackProviders({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
      <Toaster />
      <ValidacionEnEspanol />
    </ConfirmProvider>
  );
}
