"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ApprovedTemplate } from "@/lib/api/types";
import { faltantes, rellenarCuerpo } from "@/lib/plantillas";
import { useAction } from "@/lib/use-action";

/**
 * Respuesta humana fuera de la ventana de 24 h (HU-ARCH-13): WhatsApp solo acepta
 * plantillas aprobadas, así que se elige una de la conexión y se completan sus variables.
 */
export function TemplatePicker({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: () => void;
}) {
  const [plantillas, setPlantillas] = useState<ApprovedTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegida, setElegida] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const enviar = useAction();

  useEffect(() => {
    let vivo = true;
    void fetch(`/api/conversations/${conversationId}/templates`)
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as
          | ApprovedTemplate[]
          | { error?: string }
          | null;
        if (!vivo) return;
        if (!res.ok || !Array.isArray(json)) {
          setError((json as { error?: string } | null)?.error ?? "No se pudieron cargar las plantillas.");
          return;
        }
        setPlantillas(json);
      })
      .catch(() => vivo && setError("No se pudieron cargar las plantillas."));
    return () => {
      vivo = false;
    };
  }, [conversationId]);

  const plantilla = plantillas?.find((p) => p.id === elegida) ?? null;
  const pendientes = plantilla ? faltantes(plantilla.variables, valores) : [];

  async function send() {
    if (!plantilla || pendientes.length > 0) return;
    const ok = await enviar.run(async () => {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "template", template_id: plantilla.id, variables: valores }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, error: json.error, success: "Plantilla enviada." };
    });
    if (ok) onSent();
  }

  return (
    <div
      role="region"
      aria-label="Responder con una plantilla"
      className="flex flex-col gap-3 rounded-md border border-warning p-4"
    >
      <p className="text-sm text-body">
        Pasaron más de 24 horas desde el último mensaje del cliente. WhatsApp solo permite
        escribirle con una plantilla aprobada.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      {plantillas && plantillas.length === 0 && (
        <p className="text-sm text-body">
          Esta conexión no tiene plantillas aprobadas. Créalas en Plantillas de WhatsApp.
        </p>
      )}
      {plantillas && plantillas.length > 0 && (
        <>
          <Field label="Plantilla" htmlFor={`tpl-${conversationId}`}>
            <Select
              id={`tpl-${conversationId}`}
              value={elegida}
              onChange={(e) => {
                setElegida(e.target.value);
                setValores({});
              }}
            >
              <option value="">Elige una plantilla…</option>
              {plantillas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.language})
                </option>
              ))}
            </Select>
          </Field>
          {plantilla && (
            <>
              {plantilla.variables.map((v) => (
                <Field key={v} label={`Variable {{${v}}}`} htmlFor={`tpl-${conversationId}-${v}`}>
                  <Input
                    id={`tpl-${conversationId}-${v}`}
                    value={valores[v] ?? ""}
                    maxLength={1000}
                    onChange={(e) => setValores((prev) => ({ ...prev, [v]: e.target.value }))}
                  />
                </Field>
              ))}
              <p className="rounded-sm bg-surface-2 p-3 text-sm text-body" aria-live="polite">
                {rellenarCuerpo(plantilla.body, valores)}
              </p>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={() => void send()}
                  disabled={pendientes.length > 0 || enviar.pending}
                >
                  {enviar.pending ? "Enviando…" : "Enviar plantilla"}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
