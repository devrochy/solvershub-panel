"use client";

import { useSyncExternalStore } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  dismiss,
  getToasts,
  pauseAutoDismiss,
  resumeAutoDismiss,
  subscribe,
  type ToastItem,
} from "@/lib/toast-store";

/**
 * Toasts del panel (HU-UI-02): éxito con `role="status"` (cierre automático a
 * los 5 s, pausa con hover) y error con `role="alert"` (queda hasta cerrarlo).
 * Animación ≤200 ms; sin animación con `prefers-reduced-motion`.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts, getToasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const esError = item.kind === "error";
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg",
        "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
        esError
          ? "border-status-danger-border bg-surface-raised text-headline"
          : "border-status-success-border bg-surface-raised text-headline",
      )}
      onMouseEnter={() => pauseAutoDismiss(item.id)}
      onMouseLeave={() => resumeAutoDismiss(item.id, item.kind)}
      role={esError ? "alert" : "status"}
    >
      {esError ? (
        <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-status-danger-fg" />
      ) : (
        <CircleCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-status-success-fg" />
      )}
      <p className="flex-1 text-sm leading-5">{item.message}</p>
      <button
        aria-label="Cerrar aviso"
        className="rounded-md p-1 text-text-soft transition-colors hover:bg-hover hover:text-headline"
        onClick={() => dismiss(item.id)}
        type="button"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
