"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { InputNumero } from "@/components/ui/input-numero";
import { useAction } from "@/lib/use-action";

type MemorySettings = { short_term_turns: number; rag_top_k: number; rag_min_score: number };

/** Memoria del agente: turnos de contexto y recall RAG. */
export function MemoryForm({ memory }: { memory: MemorySettings }) {
  const [values, setValues] = useState(memory);
  const { run, pending } = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const res = await fetch("/api/settings/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar la memoria." };
      return { ok: true, success: "Memoria guardada." };
    });
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
            <InputNumero
              id="short_term_turns"
              min={1}
              max={200}
              value={values.short_term_turns}
              onValueChange={(n) => setValues((previo) => ({ ...previo, short_term_turns: n }))}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Recall RAG (top K)" htmlFor="rag_top_k" help="0 = desactivado (1–20).">
              <InputNumero
                id="rag_top_k"
                min={0}
                max={20}
                value={values.rag_top_k}
                onValueChange={(n) => setValues((previo) => ({ ...previo, rag_top_k: n }))}
              />
            </Field>
            <Field label="Similitud mínima (0–1)" htmlFor="rag_min_score">
              <InputNumero
                id="rag_min_score"
                decimal
                step={0.05}
                min={0}
                max={1}
                value={values.rag_min_score}
                onValueChange={(n) => setValues((previo) => ({ ...previo, rag_min_score: n }))}
              />
            </Field>
          </div>


          <div>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Guardando…" : "Guardar memoria"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
