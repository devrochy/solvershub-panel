"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";

type MemorySettings = { short_term_turns: number; rag_top_k: number; rag_min_score: number };

/** Memoria del agente: turnos de contexto y recall RAG. */
export function MemoryForm({ memory }: { memory: MemorySettings }) {
  const router = useRouter();
  const [values, setValues] = useState(memory);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ loading: true });
    const res = await fetch("/api/settings/memory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar." });
      return;
    }
    setStatus({ success: "Memoria guardada." });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <Field
            label="Turnos de contexto (memoria corta)"
            htmlFor="short_term_turns"
            help="Cuántos mensajes recientes ve el agente. 1–200."
          >
            <Input
              id="short_term_turns"
              type="number"
              min={1}
              max={200}
              value={values.short_term_turns}
              onChange={(e) => setValues({ ...values, short_term_turns: Number(e.target.value) })}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Recall RAG (top K)" htmlFor="rag_top_k" help="0 = desactivado (1–20).">
              <Input
                id="rag_top_k"
                type="number"
                min={0}
                max={20}
                value={values.rag_top_k}
                onChange={(e) => setValues({ ...values, rag_top_k: Number(e.target.value) })}
              />
            </Field>
            <Field label="Similitud mínima (0–1)" htmlFor="rag_min_score">
              <Input
                id="rag_min_score"
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={values.rag_min_score}
                onChange={(e) => setValues({ ...values, rag_min_score: Number(e.target.value) })}
              />
            </Field>
          </div>

          <FormFeedback error={status.error} success={status.success} />

          <div>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar memoria"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
