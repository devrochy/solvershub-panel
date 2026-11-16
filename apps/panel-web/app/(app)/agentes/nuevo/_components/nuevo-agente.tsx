"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PlantillasEnTarjetas } from "@/app/(app)/agentes/nuevo/_components/plantillas-en-tarjetas";
import { RecorridoDelAgente } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import { AvisoDeRequisitos } from "@/components/domain/aviso-de-requisitos";
import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { NOMBRE_MAX, cuerpoDeCreacion, elegirTipo, ESTADO_INICIAL, type EstadoDelAsistente } from "@/lib/agente-asistente";
import { PASOS, type NegocioDelEditor } from "@/lib/agentes-editor";
import type { AgentTemplate } from "@/lib/api/types";
import { esLimiteDePlan } from "@/lib/plan-limite";
import { useAction } from "@/lib/use-action";
import { conversacionDeVoz } from "@/lib/vista-previa";

/** Ids de pasos del guion que no son preguntas de opción (los toma el propio recorrido). */
const PROPIOS = new Set(["tipo", "nombre", "contenido", "revisar", "datos", "cargado", "probar"]);

/**
 * Nuevo agente con el recorrido común (HU-AOS-77, SPEC-47): es el paso «Identidad» de los ocho. Se elige
 * la plantilla, se contesta su guion (con el valor sugerido ya marcado) y se le pone nombre; «Crear
 * borrador y seguir» crea el borrador con `from-script` y lleva al editor en modo crear desde «Cómo
 * habla». El borrador nace aquí (y no al salir de «Horario y reglas») porque la voz y lo demás se
 * guardan en él.
 */
export function NuevoAgente({ plantillas, negocio }: { plantillas: AgentTemplate[]; negocio: NegocioDelEditor }) {
  const router = useRouter();
  const { run, pending } = useAction({ refresh: false });
  const [estado, setEstado] = useState<EstadoDelAsistente>(ESTADO_INICIAL);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [existente, setExistente] = useState<string | null>(null);
  const [limite, setLimite] = useState<string | null>(null);

  const plantilla = plantillas.find((p) => p.key === estado.plantilla) ?? null;
  const preguntas = (plantilla?.questions ?? []).filter((q) => q.type === "option" && !PROPIOS.has(q.id));
  const nombre = estado.nombre.trim() || plantilla?.name || "";

  function validar(): string | null {
    if (!plantilla) return "Elige qué quieres que haga tu agente.";
    if (!plantilla.available) return "Este tipo de agente no está disponible en tu servicio por ahora.";
    if (estado.nombre.trim().length > NOMBRE_MAX) return `El nombre admite hasta ${NOMBRE_MAX} caracteres.`;
    const sinRespuesta = preguntas.find((q) => !q.options.some((o) => o.id === estado.respuestas[q.id]));
    return sinRespuesta ? `Elige una opción en «${sinRespuesta.text}».` : null;
  }

  async function crear() {
    const problema = validar();
    setError(problema);
    if (problema || !plantilla) return;
    setExistente(null);
    setLimite(null);
    await run(async () => {
      const res = await fetch("/api/agent-editor/from-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoDeCreacion(estado, plantilla)),
      });
      const json = (await res.json().catch(() => ({}))) as {
        agentId?: string;
        error?: string;
        code?: string;
        fields?: Record<string, string>;
      };
      if (!res.ok || !json.agentId) {
        if (json.code === "key_taken" && json.fields?.agent_id) setExistente(json.fields.agent_id);
        setLimite(esLimiteDePlan(json.code) ? (json.error ?? "Llegaste al tope de agentes de tu plan.") : null);
        const mensaje = Object.entries(json.fields ?? {}).find(([k]) => k !== "agent_id")?.[1];
        setError(mensaje ?? null);
        return { ok: false, status: res.status, error: json.error ?? "No se pudo crear el agente." };
      }
      if (descripcion.trim()) {
        // `from-script` no recibe la descripción: va aparte. Si falla, el borrador ya existe y se edita en Identidad.
        await fetch(`/api/agent-editor/${json.agentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nombre, description: descripcion.trim() }),
        }).catch(() => null);
      }
      router.push(`/agentes/${json.agentId}/editar?paso=voz&modo=crear`);
      return { ok: true, success: "Borrador creado. Sigue con cómo habla tu agente." };
    });
  }

  return (
    <RecorridoDelAgente
      pasos={PASOS.map((p) => ({ id: p.id, titulo: p.titulo, corto: p.corto }))}
      actual="identidad"
      modo="en-orden"
      etiquetaDePasos="Pasos para crear el agente"
      pregunta="¿Qué quieres que haga tu agente?"
      nivelDePregunta="h2"
      dentroDelPanel
      vistaPrevia={
        negocio.voz
          ? {
              negocio: negocio.nombre,
              agente: nombre || "Tu agente",
              subtitulo: `${nombre || "Tu agente"} · borrador sin crear`,
              mensajes: conversacionDeVoz(negocio.voz, nombre || "Tu agente", negocio.nombre),
            }
          : undefined
      }
      principal={{ texto: "Crear borrador y seguir", onClick: () => void crear(), cargando: pending, deshabilitado: pending }}
    >
      <div className="flex flex-col gap-8">
        <PlantillasEnTarjetas
          plantillas={plantillas}
          value={estado.plantilla ?? undefined}
          onValueChange={(key) => {
            const elegida = plantillas.find((p) => p.key === key);
            if (!elegida) return;
            setEstado({ ...elegirTipo(elegida), nombre: estado.nombre });
            setError(null);
            setExistente(null);
          }}
        />
        {plantilla && !plantilla.available && (
          <div>
            <Badge variant="warning">No disponible en tu servicio</Badge>
          </div>
        )}
        {preguntas.map((q) => (
          <RadioGroup
            key={q.id}
            label={q.text}
            name={`pregunta-${q.id}`}
            value={estado.respuestas[q.id]}
            onValueChange={(valor) => setEstado({ ...estado, respuestas: { ...estado.respuestas, [q.id]: valor } })}
            options={q.options.map((o) => ({
              value: o.id,
              label: o.id === q.default ? `${o.text} · sugerido` : o.text,
              description: o.help || undefined,
            }))}
          />
        ))}
        {plantilla && (
          <div className="flex max-w-xl flex-col gap-4">
            <Field
              label="Nombre del agente (opcional)"
              htmlFor="nombre-agente"
              help={`Si lo dejas vacío, se llama «${plantilla.name}». Lo puedes cambiar después.`}
            >
              <Input
                id="nombre-agente"
                value={estado.nombre}
                maxLength={NOMBRE_MAX}
                onChange={(e) => setEstado({ ...estado, nombre: e.target.value })}
              />
            </Field>
            <Field label="Para qué sirve (opcional)" htmlFor="descripcion-agente" help="Una frase para tu equipo. Los clientes no la ven.">
              <Textarea
                id="descripcion-agente"
                value={descripcion}
                maxLength={1000}
                rows={2}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </Field>
            <AvisoDeRequisitos
              requisitos={plantilla.requirements}
              titulo="Puedes crearlo, pero tu agente no funcionará del todo hasta que configures:"
            />
          </div>
        )}
        <FormFeedback error={error ?? undefined} />
        {existente && (
          <p role="alert" className="text-sm text-body">
            Ya tienes un agente de este tipo.{" "}
            <Link className="text-link underline" href={`/agentes/${existente}/editar`}>
              Editarlo
            </Link>
          </p>
        )}
        {limite && <AvisoLimiteDePlan mensaje={limite} />}
      </div>
    </RecorridoDelAgente>
  );
}
