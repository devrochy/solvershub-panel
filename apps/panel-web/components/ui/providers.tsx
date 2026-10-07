"use client";

import type { ReactNode } from "react";

import { ConfirmProvider } from "@/components/ui/confirm";
import { Toaster } from "@/components/ui/toaster";

/** Proveedores globales de feedback (HU-UI-02): confirmaciones y toasts. */
export function FeedbackProviders({ children }: { children: ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
      <Toaster />
    </ConfirmProvider>
  );
}
