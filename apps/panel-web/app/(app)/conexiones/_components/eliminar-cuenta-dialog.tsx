"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { InputPassword } from "@/components/ui/input-password";
import { toast } from "@/lib/toast-store";

/**
 * Elimina (archiva) una conexión. Exige confirmación explícita y la contraseña actual;
 * el backend hace el soft-delete, revoca los tokens y deja la auditoría.
 */
export function EliminarCuentaDialog({
  connectionId,
  label,
  kind = "channel_connection",
  redirectTo,
  trigger,
  open,
  onOpenChange,
}: {
  connectionId: string;
  label: string;
  kind?: "channel_connection" | "meta_connection";
  /** A dónde volver después de eliminar (p. ej. `/conexiones` desde el hub). */
  redirectTo?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (abierto: boolean) => void;
}) {
  const router = useRouter();
  const [interno, setInterno] = useState(false);
  const abierto = open ?? interno;
  const cambiar = onOpenChange ?? setInterno;
  const [confirmo, setConfirmo] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function alCambiar(next: boolean) {
    if (!next) {
      setConfirmo(false);
      setPassword("");
      setError(null);
    }
    cambiar(next);
  }

  async function eliminar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/connections/${encodeURIComponent(connectionId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", kind, password }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setEnviando(false);
    if (!res.ok) {
      setError(json.error ?? "No se pudo eliminar la cuenta.");
      return;
    }
    toast.success("Cuenta eliminada.");
    alCambiar(false);
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent title="Eliminar cuenta" description={label} className="max-w-md">
        <form onSubmit={eliminar} className="flex flex-col gap-4">
          <p className="text-sm text-body">
            {kind === "meta_connection"
              ? "Se archivará la cuenta, sus números y sus WABAs, y se revocarán sus tokens. Podrás reconectarla después."
              : "El negocio dejará de recibir mensajes por esta conexión. El historial se conserva."}
          </p>
          <label className="flex items-start gap-2 text-sm text-body">
            <input
              type="checkbox"
              checked={confirmo}
              onChange={(e) => setConfirmo(e.target.checked)}
              className="mt-0.5"
            />
            <span>Entiendo que la conexión se archivará y sus tokens se revocarán.</span>
          </label>
          <Field label="Contraseña actual" htmlFor={`eliminar-${connectionId}`} required>
            <InputPassword
              id={`eliminar-${connectionId}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-status-danger-fg">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={enviando}
              disabled={!confirmo || !password}
            >
              Eliminar cuenta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
