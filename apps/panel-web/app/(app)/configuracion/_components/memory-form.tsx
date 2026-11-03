"use client";

import { useMemo, useState, type FormEvent } from "react";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { InputNumero } from "@/components/ui/input-numero";
import type { CatalogoConfig } from "@/lib/api/types";
import { ayudaDelCatalogo, indexarCatalogo } from "@/lib/catalogo-config";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { igualProfundo } from "@/lib/configuracion-secciones";
import { useAction } from "@/lib/use-action";

type MemorySettings = { short_term_turns: number; rag_top_k: number; rag_min_score: number };

/** Memoria del agente: turnos de contexto y búsqueda de conocimiento (RAG). */
export function MemoryForm({
  memory,
  catalogo = null,
  puedeEditar = true,
}: {
  memory: MemorySettings;
  catalogo?: CatalogoConfig | null;
  puedeEditar?: boolean;
}) {
  const indice = useMemo(() => indexarCatalogo(catalogo), [catalogo]);
  const ayuda = (clave: string, respaldo: string) => ayudaDelCatalogo(indice, clave, respaldo);
  const [values, setValues] = useState(memory);
  const [guardado, setGuardado] = useState(memory);
  const { run, pending } = useAction();
  useAvisarCambios("memoria", !igualProfundo(values, guardado));
  // Con 0 resultados de recall no se busca nada: la similitud mínima no tiene a qué aplicarse.
  const sinRecall = values.rag_top_k === 0;

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
      setGuardado(values);
      return { ok: true, success: "Memoria guardada." };
    });
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-5">
          <Field
            label="Turnos de contexto (memoria corta)"
            htmlFor="short_term_turns"
            help={ayuda("short_term_turns", "Cuántos mensajes recientes ve el agente. 1–200.")}
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
            <Field
              label="Conocimiento a buscar (top K)"
              htmlFor="rag_top_k"
              help={ayuda("rag_top_k", "Cuántos fragmentos de tu conocimiento y de conversaciones pasadas se le pasan al asistente en cada respuesta. 0 = no busca nada; de 1 a 20.")}
            >
              <InputNumero
                id="rag_top_k"
                min={0}
                max={20}
                value={values.rag_top_k}
                onValueChange={(n) => setValues((previo) => ({ ...previo, rag_top_k: n }))}
              />
            </Field>
            <Field
              label="Similitud mínima (0–1)"
              htmlFor="rag_min_score"
              help={
                sinRecall
                  ? "No aplica mientras el conocimiento a buscar sea 0: sube ese valor para usarla."
                  : ayuda("rag_min_score", "Qué tan parecido debe ser un fragmento a la pregunta para usarse. Más cerca de 1, solo entra lo muy relacionado; más cerca de 0, entra casi todo.")
              }
            >
              <InputNumero
                id="rag_min_score"
                decimal
                step={0.05}
                min={0}
                max={1}
                disabled={sinRecall}
                value={values.rag_min_score}
                onValueChange={(n) => setValues((previo) => ({ ...previo, rag_min_score: n }))}
              />
            </Field>
          </div>
          </ControlesEditables>

          {puedeEditar ? (
            <div>
              <Button type="submit" variant="accent" disabled={pending}>
                {pending ? "Guardando…" : "Guardar memoria"}
              </Button>
            </div>
          ) : (
            <AvisoSoloLectura />
          )}
        </form>
      </CardContent>
    </Card>
  );
}
