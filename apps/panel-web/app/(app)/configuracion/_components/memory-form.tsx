"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
