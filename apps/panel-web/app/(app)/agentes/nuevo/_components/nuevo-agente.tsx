"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { agentMeta } from "@/components/domain/agent-icon";
import { BarraRecomendado } from "@/components/domain/agentes/recorrido/barra-recomendado";
import { TarjetaDelEscenario } from "@/components/domain/agentes/recorrido/escenario-piezas";
import { EscenarioTarjeta } from "@/components/domain/agentes/recorrido/escenario-tarjeta";
import { NombreSugerido } from "@/components/domain/agentes/recorrido/nombre-sugerido";
import { RecorridoDelAgente } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import { ChatDeVistaPrevia } from "@/components/domain/agentes/recorrido/vista-previa-whatsapp";
import { AvisoDeRequisitos } from "@/components/domain/aviso-de-requisitos";
import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { useConfirm } from "@/components/ui/confirm";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Textarea } from "@/components/ui/textarea";
import {
  cuerpoDeCreacion,
  elegirTipo,
  estadoRecomendado,
  nombreSugeridoDe,
  ocupadoDe,
  sePuedeElegir,
  textoDeOcupado,
  tipoDeLaPlantilla,
  type AgenteDelNegocio,
  type EstadoDelAsistente,
  type Ocupado,
} from "@/lib/agente-asistente";
import { type NegocioDelEditor } from "@/lib/agentes-editor";
import type { AgentTemplate } from "@/lib/api/types";
import { esLimiteDePlan } from "@/lib/plan-limite";
import { ESTACIONES_DE_NUEVO_AGENTE, cambiosFrenteARecomendado, errorDelNombre, ideasDeNombre } from "@/lib/ruta-de-lanzamiento";
import { rutaDePersonalizar } from "@/lib/rutas-de-agente";
import { useAction } from "@/lib/use-action";

/** Ids de pasos del guion que no son preguntas de opción (los toma el propio recorrido). */
const PROPIOS = new Set(["tipo", "nombre", "contenido", "revisar", "datos", "cargado", "probar"]);

/** Lo que se compara con lo recomendado en la estación 1: el tipo y cada respuesta del guion. */
function valoresDe(estado: EstadoDelAsistente): Record<string, string | null> {
  return { tipo: estado.plantilla, ...estado.respuestas };
}

/**
 * Nuevo agente, estación 1 de la ruta de lanzamiento (HU-AOS-86, SPEC-49): Tipo. Todo llega con lo
 * recomendado: el primer tipo libre, el guion con su `Question.default` y el nombre sugerido del tipo
 * («Tomás» en Agenda). Los tipos que el negocio ya tiene se avisan en la tarjeta antes de crear: con
 * un agente activo, «Editar a {nombre}»; con uno archivado, «Desarchívalo». «Crear a {nombre} y seguir»
 * crea el borrador con `from-script` y sigue en Habilidades (estación 2, en el editor en modo crear).
 * El 409 `key_taken` queda como red de seguridad por si otro usuario creó el tipo mientras tanto.
 */
export function NuevoAgente({
  plantillas,
  negocio,
  agentes = [],
}: {
  plantillas: AgentTemplate[];
  negocio: NegocioDelEditor;
  /** Los agentes del negocio (`/admin/agents/overview`), para saber qué tipos están ocupados. */
  agentes?: readonly AgenteDelNegocio[];
}) {
  const id = useId();
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useAction({ refresh: false });
  const desarchivar = useAction({ refresh: false });
  const [recomendado] = useState<EstadoDelAsistente>(() => estadoRecomendado(plantillas, agentes));
  const [estado, setEstado] = useState<EstadoDelAsistente>(recomendado);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  // El 409 `key_taken` de una carrera: el tipo que ya existe y su agente.
  const [existente, setExistente] = useState<{ texto: string; ocupado: Ocupado } | null>(null);
  const [limite, setLimite] = useState<string | null>(null);

  const plantilla = plantillas.find((p) => p.key === estado.plantilla) ?? null;
  const preguntas = (plantilla?.questions ?? []).filter((q) => q.type === "option" && !PROPIOS.has(q.id));
  const tipo = tipoDeLaPlantilla(plantilla?.key);
  const nombre = estado.nombre.trim();
  const sugerido = plantilla ? nombreSugeridoDe(plantilla) : "";
  const cambios = cambiosFrenteARecomendado(valoresDe(estado), valoresDe(recomendado)).length;

  function elegir(key: string) {
    const elegida = plantillas.find((p) => p.key === key);
    if (!elegida || !sePuedeElegir(elegida, agentes)) return;
    // El nombre sigue al tipo mientras el dueño no lo haya cambiado (vacío o el sugerido del tipo anterior).
    const tocado = nombre !== "" && nombre !== sugerido;
    setEstado({ ...elegirTipo(elegida), nombre: tocado ? estado.nombre : nombreSugeridoDe(elegida) });
    setError(null);
    setExistente(null);
  }

  function validar(): string | null {
    if (!plantilla) return "Elige qué quieres que haga tu agente.";
    if (!plantilla.available) return "Este tipo de agente no está disponible en tu servicio por ahora.";
    const delNombre = errorDelNombre(estado.nombre);
    if (delNombre) return delNombre;
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
        if (json.code === "key_taken" && json.fields?.agent_id) {
          // Red de seguridad: el mismo aviso de la tarjeta, con el agente que ya ocupa el tipo.
          const delNegocio = agentes.find((a) => a.id === json.fields?.agent_id);
          const ocupado: Ocupado = {
            id: json.fields.agent_id,
            nombre: delNegocio?.name || plantilla.name,
            archivado: delNegocio?.status === "archived",
          };
          setExistente({ texto: textoDeOcupado(plantilla.name, ocupado.archivado), ocupado });
          setError(null);
          return { ok: false, status: res.status, error: textoDeOcupado(plantilla.name, ocupado.archivado) };
        }
        setLimite(esLimiteDePlan(json.code) ? (json.error ?? "Llegaste al tope de agentes de tu plan.") : null);
        const mensaje = Object.entries(json.fields ?? {}).find(([k]) => k !== "agent_id")?.[1];
        setError(mensaje ?? null);
        return { ok: false, status: res.status, error: json.error ?? "No se pudo crear el agente." };
      }
      if (descripcion.trim()) {
        // `from-script` no recibe la descripción: va aparte. Si falla, el borrador ya existe y se edita en Personalizar.
        await fetch(`/api/agent-editor/${json.agentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nombre, description: descripcion.trim() }),
        }).catch(() => null);
      }
      // Estación 2 de 5: Habilidades, en el editor en modo crear.
      router.push(rutaDePersonalizar(json.agentId, { paso: "habilidades", modo: "crear" }));
      return { ok: true, success: `Borrador de ${nombre} creado. Sigue con sus habilidades.` };
    });
  }

  /** «Desarchívalo»: el mismo PATCH que «Reactivar» de la ficha; si sale bien, va a la ficha del agente. */
  async function desarchivarAgente(ocupado: Ocupado) {
    const ok = await confirm({
      title: `¿Desarchivar a ${ocupado.nombre}?`,
      description: "Vuelve a poder editarse y publicarse. Para que atienda, agrégalo a una conexión.",
      confirmLabel: "Desarchivar",
      destructive: false,
    });
    if (!ok) return;
    await desarchivar.run(async () => {
      const res = await fetch(`/api/agent-editor/${ocupado.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, status: res.status, error: json.error || "No se pudo desarchivar el agente." };
      }
      router.push(`/agentes/${ocupado.id}`);
      return { ok: true, success: `Desarchivaste a ${ocupado.nombre}.` };
    });
  }

  function accionDeOcupado(ocupado: Ocupado) {
    return ocupado.archivado ? (
      <button
        type="button"
        className="font-medium text-link underline underline-offset-2 disabled:opacity-50"
        onClick={() => void desarchivarAgente(ocupado)}
        disabled={desarchivar.pending}
      >
        Desarchívalo
      </button>
    ) : (
      <Link className="font-medium text-link underline underline-offset-2" href={`/agentes/${ocupado.id}/personalizar`}>
        Editar a {ocupado.nombre}
      </Link>
    );
  }

  const quien = nombre || "tu agente";
  return (
    <RecorridoDelAgente
      disposicion="ruta"
      pasos={ESTACIONES_DE_NUEVO_AGENTE}
      actual="tipo"
      modo="en-orden"
      etiquetaDePasos="Pasos para crear el agente"
      pregunta="¿Qué quieres que haga tu agente?"
      nivelDePregunta="h1"
      bajada="Viene con lo recomendado por SolversHub: revisa y sigue, o cambia lo que quieras."
      queSigue="Sigue: Habilidades."
      dentroDelPanel
      principal={{
        texto: nombre ? `Crear a ${nombre} y seguir` : "Crear y seguir",
        onClick: () => void crear(),
        cargando: pending,
        deshabilitado: pending,
      }}
      lateral={
        <EscenarioTarjeta agente={nombre} estado="Borrador" leyenda="Vista previa: no envía mensajes">
          <div className="grid grid-cols-2 gap-3">
            <TarjetaDelEscenario etiqueta="Se dedica a" valor={plantilla?.name ?? "Elige un tipo"} hecha={Boolean(plantilla)} />
            <TarjetaDelEscenario etiqueta="Se llama" valor={nombre || "Sin nombre"} hecha={Boolean(nombre)} />
          </div>
          {tipo && <ChatDeVistaPrevia key={`${tipo}:${nombre}`} tipo={tipo} estacion="tipo" agente={quien} negocio={negocio.nombre} />}
        </EscenarioTarjeta>
      }
    >
      <div className="flex flex-col gap-8">
        <BarraRecomendado cambios={cambios} onUsar={() => setEstado(recomendado)} />
        <GrupoDeOpciones titulo="Tipo de agente" unica className="grid gap-3 sm:grid-cols-2">
          {plantillas.map((p) => {
            const ocupado = ocupadoDe(p.key, agentes);
            const Icono = agentMeta(p.key, p.name).icon;
            const nota = ocupado
              ? textoDeOcupado(p.name, ocupado.archivado)
              : !p.available
                ? "No está en tu servicio por ahora. Pídelo a SolversHub."
                : undefined;
            return (
              <TarjetaElegible
                key={p.key}
                nombre={`${id}-tipo`}
                valor={p.key}
                elegida={estado.plantilla === p.key}
                onElegir={elegir}
                titulo={p.name}
                ayuda={p.description}
                icono={<Icono className="h-5 w-5" />}
                baldosa
                etiqueta={p.key === recomendado.plantilla ? "Recomendado" : undefined}
                deshabilitada={Boolean(nota)}
                nota={nota}
                accion={ocupado ? accionDeOcupado(ocupado) : undefined}
              />
            );
          })}
        </GrupoDeOpciones>
        {preguntas.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {preguntas.map((q) => (
              <GrupoDeOpciones key={q.id} titulo={q.text} unica className="flex-col">
                {q.options.map((o) => (
                  <TarjetaElegible
                    key={o.id}
                    nombre={`${id}-pregunta-${q.id}`}
                    valor={o.id}
                    elegida={estado.respuestas[q.id] === o.id}
                    onElegir={(valor) => setEstado({ ...estado, respuestas: { ...estado.respuestas, [q.id]: valor } })}
                    titulo={o.text}
                    razon={o.help || undefined}
                    etiqueta={o.id === q.default ? "Recomendado" : undefined}
                    className="w-full"
                  />
                ))}
              </GrupoDeOpciones>
            ))}
          </div>
        )}
        {plantilla && (
          <div className="flex max-w-xl flex-col gap-4">
            <NombreSugerido
              valor={estado.nombre}
              onCambiar={(n) => setEstado({ ...estado, nombre: n })}
              ideas={ideasDeNombre(sugerido, tipo, 3)}
              etiqueta="Nombre del agente"
            />
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-link">Para qué sirve (opcional)</summary>
              <div className="pt-3">
                <Field label="Para qué sirve" htmlFor={`${id}-descripcion`} help="Una frase para tu equipo. Los clientes no la ven.">
                  <Textarea
                    id={`${id}-descripcion`}
                    value={descripcion}
                    maxLength={1000}
                    rows={2}
                    onChange={(e) => setDescripcion(e.target.value)}
                  />
                </Field>
              </div>
            </details>
            <AvisoDeRequisitos
              requisitos={plantilla.requirements}
              titulo="Puedes crearlo, pero tu agente no funcionará del todo hasta que configures:"
            />
          </div>
        )}
        <FormFeedback error={error ?? undefined} />
        {existente && (
          <p role="alert" className="flex flex-wrap items-center gap-x-2 text-sm text-body">
            {existente.texto} {accionDeOcupado(existente.ocupado)}
          </p>
        )}
        {limite && <AvisoLimiteDePlan mensaje={limite} />}
      </div>
    </RecorridoDelAgente>
  );
}
