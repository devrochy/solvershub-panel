"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

type Cambio = {
  id: string;
  campos_propuestos: Record<string, unknown>;
  estado: string;
  solicitado_por: string;
  fecha: string;
};

const ETIQUETAS: Record<string, string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  negocio: "Negocio",
  telefono_whatsapp: "Teléfono WhatsApp",
  tipo_documento: "Tipo de documento",
  numero_documento: "Número de documento",
};

/** Cambios propuestos por los gestores: aprobar (aplica) o rechazar (con motivo). */
export function ChangeActions({ cambios }: { cambios: Cambio[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: string; error?: string; success?: string }>({});
  const [motivo, setMotivo] = useState<Record<string, string>>({});

  if (cambios.length === 0) {
    return null;
  }

  async function decidir(id: string, decision: "aprobar" | "rechazar") {
    setStatus({ loading: id });
    const res = await fetch(`/api/pack/cobranza/client-changes/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, motivo: motivo[id] ?? "" }),
    });
    setStatus({});
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo procesar el cambio." });
      return;
    }
    setStatus({ success: decision === "aprobar" ? "Cambio aprobado y aplicado." : "Cambio rechazado." });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Cambios propuestos ({cambios.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <FormFeedback error={status.error} success={status.success} />
        {cambios.map((cambio) => (
          <div
            key={cambio.id}
            className="flex flex-col gap-3 rounded-md border border-border-soft p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">pendiente</Badge>
              <span className="text-xs text-text-soft">
                {cambio.fecha} · {cambio.solicitado_por || "—"}
              </span>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {Object.entries(cambio.campos_propuestos).map(([campo, valor]) => (
                <li key={campo} className="text-body">
                  <span className="text-text-soft">{ETIQUETAS[campo] ?? campo}:</span>{" "}
                  <span className="text-headline">{String(valor)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={status.loading === cambio.id}
                onClick={() => decidir(cambio.id, "aprobar")}
                size="sm"
                variant="accent"
              >
                {status.loading === cambio.id ? "…" : "Aprobar"}
              </Button>
              <Input
                aria-label="Motivo del rechazo"
                className="h-8 w-56"
                onChange={(e) => setMotivo((previo) => ({ ...previo, [cambio.id]: e.target.value }))}
                placeholder="Motivo (para rechazar)"
                value={motivo[cambio.id] ?? ""}
              />
              <Button
                className="text-danger"
                disabled={status.loading === cambio.id}
                onClick={() => decidir(cambio.id, "rechazar")}
               aria-label="Rechazar" size="icon" title="Rechazar" variant="outline"><X className="h-4 w-4 text-danger" aria-hidden /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
