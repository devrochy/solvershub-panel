"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { InputNumero } from "@/components/ui/input-numero";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { CatalogoConfig } from "@/lib/api/types";
import { ayudaDelCatalogo, indexarCatalogo } from "@/lib/catalogo-config";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { MEMORIA_BUSCA, MEMORIA_RECUERDA, cercano } from "@/lib/configuracion-resumen";
import { igualProfundo } from "@/lib/configuracion-secciones";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/use-action";

type MemorySettings = { short_term_turns: number; rag_top_k: number; rag_min_score: number };

/**
 * Memoria del agente: turnos de contexto y búsqueda de conocimiento (RAG). Se elige en palabras («Cuánto
 * recuerda: Normal») y los números exactos quedan en «Avanzado» (CFG-03).
 */
export function MemoryForm({
  memory,
  catalogo = null,
  puedeEditar = true,
  onGuardado,
}: {
  memory: MemorySettings;
  catalogo?: CatalogoConfig | null;
  puedeEditar?: boolean;
  /** Tras guardar bien: el cajón se cierra. */
  onGuardado?: () => void;
}) {
  const indice = useMemo(() => indexarCatalogo(catalogo), [catalogo]);
  const ayuda = (clave: string, respaldo: string) => ayudaDelCatalogo(indice, clave, respaldo);
  const [values, setValues] = useState(memory);
  const [guardado, setGuardado] = useState(memory);
  const { run, pending } = useAction();
  useAvisarCambios("memoria", !igualProfundo(values, guardado));
  // Con 0 resultados de recall no se busca nada: la similitud mínima no tiene a qué aplicarse.
  const sinRecall = values.rag_top_k === 0;
  const [avanzado, setAvanzado] = useState(false);
  const recuerda = cercano(MEMORIA_RECUERDA, values.short_term_turns, (o) => o.turnos);
  const busca = cercano(MEMORIA_BUSCA, values.rag_top_k, (o) => o.fichas);
  // Si el número exacto no es el de una opción, la opción se ve marcada igual pero el número manda.
  const exactoRecuerda = recuerda.turnos === values.short_term_turns;
  const exactoBusca = busca.fichas === values.rag_top_k;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await run(async () => {
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
    if (ok) onGuardado?.();
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sh-label font-medium text-body">Cuánto recuerda de la conversación</span>
            <SegmentedControl
              label="Cuánto recuerda de la conversación"
              options={MEMORIA_RECUERDA.map((o) => ({ value: o.value, label: o.label }))}
              value={exactoRecuerda ? recuerda.value : ""}
              onChange={(v) => setValues((previo) => ({ ...previo, short_term_turns: Number(v) }))}
              className="self-start"
            />
            <p className="text-xs text-text-soft">
              {exactoRecuerda ? `Los últimos ${values.short_term_turns} mensajes.` : `Los últimos ${values.short_term_turns} mensajes (puesto a mano en «Avanzado»).`} Más memoria entiende mejor, pero cada respuesta cuesta un poco más.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sh-label font-medium text-body">Cuánto busca en lo que le enseñaste</span>
            <SegmentedControl
              label="Cuánto busca en lo que le enseñaste"
              options={MEMORIA_BUSCA.map((o) => ({ value: o.value, label: o.label }))}
              value={exactoBusca ? busca.value : ""}
              onChange={(v) => setValues((previo) => ({ ...previo, rag_top_k: Number(v) }))}
              className="self-start"
            />
            <p className="text-xs text-text-soft">Fichas de tu negocio y conversaciones pasadas que revisa antes de responder.</p>
          </div>

          <button
            type="button"
            aria-expanded={avanzado}
            aria-controls="memoria-avanzado"
            onClick={() => setAvanzado((v) => !v)}
            className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2.5 text-left text-sm text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
          >
            Avanzado: los números exactos
            <ChevronDown aria-hidden className={cn("h-4 w-4 text-text-soft transition-transform duration-150", avanzado && "rotate-180")} />
          </button>
          {avanzado && (
          <div id="memoria-avanzado" className="flex flex-col gap-5">
          <Field
            label="Mensajes que recuerda"
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
              label="Fichas que busca"
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
              label="Parecido mínimo para usar una ficha (de 0 a 1)"
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
          </div>
          )}
          </ControlesEditables>

          {puedeEditar ? (
            <div>
              <Button type="submit" variant="accent" loading={pending}>
                Guardar
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
