"use client";

import { useEffect, useState, type ReactNode } from "react";

import { CredencialesConexion } from "@/components/domain/credenciales-conexion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { CampoCredencial } from "@/lib/conexiones";

/** Vista de solo lectura de los datos con los que se registró una conexión manual. */
export function VerCredencialesDialog({
  connectionId,
  label,
  trigger,
  open,
  onOpenChange,
}: {
  connectionId: string;
  label: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (abierto: boolean) => void;
}) {
  const [interno, setInterno] = useState(false);
  const abierto = open ?? interno;
  const cambiar = onOpenChange ?? setInterno;
  const [campos, setCampos] = useState<CampoCredencial[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function alCambiar(next: boolean) {
    if (next) {
      setCampos(null);
      setError(null);
    }
    cambiar(next);
  }

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    (async () => {
      const res = await fetch(`/api/connections/${encodeURIComponent(connectionId)}/credentials`);
      const json = (await res.json().catch(() => null)) as
        | { fields?: CampoCredencial[]; error?: string }
        | null;
      if (!vivo) return;
      if (!res.ok || !json?.fields) {
        setError(json?.error ?? "No se pudieron cargar los datos de la conexión.");
        return;
      }
      setCampos(json.fields);
    })();
    return () => {
      vivo = false;
    };
  }, [abierto, connectionId]);

  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent title="Datos de la conexión" description={label} className="max-w-2xl">
        {error ? (
          <p role="alert" className="text-sm text-status-danger-fg">
            {error}
          </p>
        ) : !campos ? (
          <p className="text-sm text-text-soft">Cargando…</p>
        ) : (
          <CredencialesConexion
            campos={campos}
            revealUrl={`/api/connections/${encodeURIComponent(connectionId)}/credentials/reveal`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
