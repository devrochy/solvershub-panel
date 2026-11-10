"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { campoLegible } from "@/lib/cobranza/presentacion";

type Cambio = {
  id: string;
  campos_propuestos: Record<string, unknown>;
  estado: string;
  solicitado_por: string;
  fecha: string;
};

/** Cambios propuestos por los gestores: aprobar (aplica) o rechazar (con motivo). */
export function ChangeActions({ cambios }: { cambios: Cambio[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: string; error?: string; success?: string }>({});
  const [rechazando, setRechazando] = useState<string>();
  const [motivo, setMotivo] = useState("");

  if (cambios.length === 0) {
    return null;
  }

  async function decidir(id: string, decision: "aprobar" | "rechazar") {
    setStatus({ loading: id });
    const res = await fetch(`/api/pack/cobranza/client-changes/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, motivo: decision === "rechazar" ? motivo : "" }),
    });
    setStatus({});
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo procesar el cambio." });
      return;
    }
    setRechazando(undefined);
    setMotivo("");
    setStatus({ success: decision === "aprobar" ? "Cambio aprobado y aplicado." : "Cambio rechazado." });
    router.refresh();
  }

  return (
    <section aria-label="Cambios por aprobar" className="flex flex-col gap-2">
      <FormFeedback error={status.error} success={status.success} />
      {cambios.map((cambio) => {
        const propuesta = Object.entries(cambio.campos_propuestos)
          .map(([campo, valor]) => `${campoLegible(campo)} a ${String(valor)}`)
          .join(", ");
        const ocupado = status.loading === cambio.id;
        return (
          <div
            key={cambio.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline"
          >
            <p>
              <strong className="font-semibold">{cambio.solicitado_por || "Un gestor"}</strong> propone cambiar {propuesta}
            </p>
            {rechazando === cambio.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Motivo del rechazo"
                  className="w-56"
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Motivo del rechazo"
                  value={motivo}
                />
                <Button variant="ghost" onClick={() => setRechazando(undefined)}>
                  Cancelar
                </Button>
                <Button variant="outline" disabled={ocupado} onClick={() => void decidir(cambio.id, "rechazar")}>
                  {ocupado ? "Rechazando…" : "Confirmar rechazo"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setRechazando(cambio.id)}>
                  Rechazar
                </Button>
                <Button variant="outline" disabled={ocupado} onClick={() => void decidir(cambio.id, "aprobar")}>
                  {ocupado ? "Aprobando…" : "Aprobar"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
