"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Textarea } from "@/components/ui/textarea";

type Nota = { id: string; nota: string; fecha: string; autor: string };

/** Notas de la cartera: agregar y eliminar (con confirmación). */
export function NotesCard({ portfolioId, notes }: { portfolioId: string; notes: Nota[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});
  const [confirmando, setConfirmando] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/portfolios/${portfolioId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota: String(data.get("nota") ?? "") }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo guardar la nota." });
      return;
    }
    form.reset();
    setStatus({ success: "Nota guardada." });
    router.refresh();
  }

  async function eliminar(id: string) {
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/cobranza/notes/${id}`, { method: "DELETE" });
    setStatus({ loading: false });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo eliminar la nota." });
      return;
    }
    setConfirmando(undefined);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Notas de la cartera</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Textarea name="nota" rows={2} placeholder="Ej.: revisar cupo del cliente X" required />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={status.loading} size="sm">
              {status.loading ? "Guardando…" : "Guardar nota"}
            </Button>
            <FormFeedback error={status.error} success={status.success} />
          </div>
        </form>

        {notes.length === 0 ? (
          <p className="text-sm text-text-soft">Sin notas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border-soft px-3 py-2"
              >
                <div>
                  <p className="text-sm text-body whitespace-pre-wrap">{n.nota}</p>
                  <p className="text-xs text-text-soft">
                    {n.fecha} · {n.autor || "—"}
                  </p>
                </div>
                {confirmando === n.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      className="text-danger"
                      disabled={status.loading}
                      onClick={() => eliminar(n.id)}
                      size="sm"
                      variant="outline"
                    >
                      {status.loading ? "…" : "Confirmar"}
                    </Button>
                    <Button onClick={() => setConfirmando(undefined)} size="sm" variant="ghost">
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setConfirmando(n.id)} size="sm" variant="ghost">
                    Eliminar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
