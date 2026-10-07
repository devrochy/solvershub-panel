"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Confirmación compartida (HU-04→UI-02): explica la consecuencia antes de una
 * acción irreversible y usa el tono peligro solo cuando `destructive`.
 * Radix atrapa y devuelve el foco; Escape cancela.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm requiere <ConfirmProvider>.");
  return confirm;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (result: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => setPending({ options, resolve }));
  }, []);

  function cerrar(resultado: boolean) {
    if (!pending) return;
    pending.resolve(resultado);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <DialogPrimitive.Root open={pending !== null} onOpenChange={(open) => !open && cerrar(false)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
              "rounded-lg border border-border bg-surface p-6 shadow-lg focus:outline-none",
              "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
            )}
            role="alertdialog"
          >
            <DialogPrimitive.Title className="font-display text-lg font-semibold text-headline">
              {pending?.options.title}
            </DialogPrimitive.Title>
            {pending?.options.description && (
              <DialogPrimitive.Description className="mt-2 text-sm leading-5 text-body">
                {pending.options.description}
              </DialogPrimitive.Description>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => cerrar(false)} type="button">
                {pending?.options.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                autoFocus
                variant={pending?.options.destructive === false ? "default" : "danger"}
                onClick={() => cerrar(true)}
                type="button"
              >
                {pending?.options.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}
