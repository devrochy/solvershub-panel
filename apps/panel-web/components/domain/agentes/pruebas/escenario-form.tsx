"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EscenarioDePrueba, EscenarioDePruebaIn } from "@/lib/api/types";
import { criteriosDeTexto } from "@/lib/pruebas-del-agente";
import { useAction } from "@/lib/use-action";

import { llamar, rutaDePruebas } from "./llamar";

const listaDeTexto = (texto: string) =>
  texto
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

/**
 * Escribir o editar un escenario (HU-AOS-101): lo que pide el cliente, cómo debe responder el agente y, si se
 * quiere, qué acciones debe usar o no. Nace en borrador; «Guardar y aprobar» lo deja listo para probar.
 */
export function EscenarioForm({
  agenteId,
  escenario,
  open,
  onOpenChange,
}: {
  agenteId: string;
  /** Sin escenario, se escribe uno nuevo. */
  escenario: EscenarioDePrueba | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { run, pending } = useAction();
  const [titulo, setTitulo] = useState(escenario?.titulo ?? "");
  const [objetivo, setObjetivo] = useState(escenario?.objetivo_cliente ?? "");
  const [criterios, setCriterios] = useState(
    (escenario?.criterios ?? []).join("\n"),
  );
  const [esperadas, setEsperadas] = useState(
    (escenario?.tools_esperadas ?? []).join(", "),
  );
  const [prohibidas, setProhibidas] = useState(
    (escenario?.tools_prohibidas ?? []).join(", "),
  );
  const [error, setError] = useState<string | undefined>();

  async function guardar(aprobar: boolean) {
    setError(undefined);
    if (!titulo.trim() || !objetivo.trim()) {
      setError("Escribe un título y lo que pide el cliente.");
      return;
    }
    const cuerpo: Omit<EscenarioDePruebaIn, "estado"> & {
      estado?: "aprobado";
    } = {
      titulo: titulo.trim(),
      objetivo_cliente: objetivo.trim(),
      criterios: criteriosDeTexto(criterios),
      tools_esperadas: listaDeTexto(esperadas),
      tools_prohibidas: listaDeTexto(prohibidas),
      ...(aprobar ? { estado: "aprobado" as const } : {}),
    };
    const ok = await run(async () => {
      const res = escenario
        ? await llamar(
            rutaDePruebas(agenteId, `/${escenario.id}`),
            "PATCH",
            cuerpo,
          )
        : await llamar(rutaDePruebas(agenteId), "POST", cuerpo);
      if (res.ok)
        return {
          ok: true,
          success: escenario ? "Escenario guardado." : "Escenario agregado.",
        };
      setError(res.error);
      return {
        ok: false,
        status: res.status,
        error: res.error,
        code: res.code,
      };
    });
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={escenario ? "Editar escenario" : "Escribir un escenario"}
        description="Cuenta qué le pide un cliente a tu agente y qué esperas que haga. Lo que escribas no se envía a nadie."
        className="max-h-[90vh] max-w-xl overflow-y-auto"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void guardar(false);
          }}
        >
          <Field label="Título" htmlFor="escenario-titulo" required>
            <Input
              id="escenario-titulo"
              value={titulo}
              maxLength={120}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Cliente pide agendar una cita el sábado"
            />
          </Field>
          <Field
            label="Qué pide el cliente"
            htmlFor="escenario-objetivo"
            required
            help="Lo que el cliente simulado quiere lograr, con tus palabras."
          >
            <Textarea
              id="escenario-objetivo"
              value={objetivo}
              maxLength={2000}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Quiere una cita para el sábado en la tarde."
            />
          </Field>
          <Field
            label="Qué debe pasar"
            htmlFor="escenario-criterios"
            help="Un criterio por línea. Por ejemplo: «Ofrece solo horarios dentro del horario de atención»."
          >
            <Textarea
              id="escenario-criterios"
              value={criterios}
              onChange={(e) => setCriterios(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Acciones que debe usar"
              htmlFor="escenario-esperadas"
              help="Opcional, separadas por comas."
            >
              <Input
                id="escenario-esperadas"
                value={esperadas}
                onChange={(e) => setEsperadas(e.target.value)}
              />
            </Field>
            <Field
              label="Acciones que no debe usar"
              htmlFor="escenario-prohibidas"
              help="Opcional, separadas por comas."
            >
              <Input
                id="escenario-prohibidas"
                value={prohibidas}
                onChange={(e) => setProhibidas(e.target.value)}
              />
            </Field>
          </div>
          <FormFeedback error={error} />
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            {(!escenario || escenario.estado === "borrador") && (
              <Button
                type="button"
                variant="outline"
                loading={pending}
                onClick={() => void guardar(true)}
              >
                Guardar y aprobar
              </Button>
            )}
            <Button type="submit" loading={pending}>
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
