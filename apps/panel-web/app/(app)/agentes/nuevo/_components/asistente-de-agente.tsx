"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AvisoDeRequisitos } from "@/components/domain/aviso-de-requisitos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  ESTADO_INICIAL,
  NOMBRE_MAX,
  cuerpoDeCreacion,
  elegirTipo,
  errorDelPaso,
  pasoDelCampo,
  pasosDelAsistente,
  textoDeAvance,
  textoDeRespuesta,
  type EstadoDelAsistente,
} from "@/lib/agente-asistente";
import type { AgentTemplate } from "@/lib/api/types";
import { habilidadLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

const CLAVE_LOCAL = "asistente-de-agente";

/** Lee el avance guardado en este navegador (solo una comodidad: sin él se empieza de cero). */
function leerGuardado(plantillas: AgentTemplate[]): { estado: EstadoDelAsistente; paso: number } | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE_LOCAL);
    if (!crudo) return null;
    const { estado, paso } = JSON.parse(crudo) as { estado?: EstadoDelAsistente; paso?: number };
    if (!estado?.plantilla || !plantillas.some((p) => p.key === estado.plantilla)) return null;
    return { estado, paso: Number.isInteger(paso) ? Math.max(0, paso as number) : 0 };
  } catch {
    return null;
  }
}

function guardar(estado: EstadoDelAsistente, paso: number) {
  try {
    window.localStorage.setItem(CLAVE_LOCAL, JSON.stringify({ estado, paso }));
  } catch {
    /* sin almacenamiento: el asistente funciona igual, solo no retoma */
  }
}

function olvidar() {
  try {
    window.localStorage.removeItem(CLAVE_LOCAL);
  } catch {
    /* nada que olvidar */
  }
}

/**
 * Asistente de creación de agentes (HU-AOS-54, SPEC-39): hasta 10 pasos según el tipo de agente.
 * El guion viene de la API (`questions` de cada plantilla); al final se crea el borrador con
 * `from-script` y se deja al dueño en «Publicar» del editor, donde elige la conexión.
 */
export function AsistenteDeAgente({ plantillas }: { plantillas: AgentTemplate[] }) {
  const router = useRouter();
  const { run, pending } = useAction({ refresh: false });
  const [estado, setEstado] = useState<EstadoDelAsistente>(ESTADO_INICIAL);
  const [indice, setIndice] = useState(0);
  const [mostrarError, setMostrarError] = useState(false);
  const [errorDeApi, setErrorDeApi] = useState<{ paso: number; mensaje: string } | null>(null);
  const [existente, setExistente] = useState<string | null>(null);
  const [retomado, setRetomado] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  const plantilla = plantillas.find((p) => p.key === estado.plantilla) ?? null;
  const pasos = pasosDelAsistente(plantilla);
  const paso = pasos[Math.min(indice, pasos.length - 1)];
  const ultimo = plantilla !== null && indice === pasos.length - 1;
  const errorLocal = mostrarError ? errorDelPaso(paso, estado, plantilla) : undefined;
  const error = errorLocal ?? (errorDeApi?.paso === indice ? errorDeApi.mensaje : undefined);

  // «Retomar»: si cerró el asistente a mitad del guion, vuelve donde quedó (guardado en este navegador).
  useEffect(() => {
    const guardado = leerGuardado(plantillas);
    if (guardado) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el navegador
      setEstado(guardado.estado);
      setIndice(guardado.paso);
      setRetomado(true);
    }
  }, [plantillas]);

  // El foco pasa al título del paso: el lector de pantalla anuncia «Paso X de N» y el paso nuevo.
  useEffect(() => {
    titulo.current?.focus();
  }, [indice]);

  function irA(i: number, siguiente: EstadoDelAsistente = estado) {
    setIndice(i);
    setMostrarError(false);
    setErrorDeApi(null);
    guardar(siguiente, i);
  }

  function avanzar() {
    if (errorDelPaso(paso, estado, plantilla)) {
      setMostrarError(true);
      return;
    }
    irA(indice + 1);
  }

  function elegir(p: AgentTemplate) {
    setExistente(null);
    const nuevo = elegirTipo(p);
    setEstado(nuevo);
    setMostrarError(false);
    guardar(nuevo, indice);
  }

  async function crear() {
    if (!plantilla) return;
    setExistente(null);
    setErrorDeApi(null);
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
      if (!res.ok) {
        if (json.code === "key_taken" && json.fields?.agent_id) setExistente(json.fields.agent_id);
        const [campo, mensaje] = Object.entries(json.fields ?? {}).find(([k]) => k !== "agent_id") ?? [];
        if (campo && mensaje) {
          const destino = pasoDelCampo(campo, pasos);
          setErrorDeApi({ paso: destino, mensaje });
          setIndice(destino);
        }
        return { ok: false, status: res.status, error: json.error ?? "No se pudo crear el agente." };
      }
      olvidar();
      router.push(`/agentes/${json.agentId}/editar?paso=publicar`);
      return { ok: true, success: "Agente creado: elige dónde atiende y publícalo." };
    });
  }

  function contenidoDelPaso() {
    if (paso.id === "tipo") {
      return (
        <div className="flex flex-col gap-3">
          <RadioGroup
            label="Qué quieres que haga tu agente"
            name="tipo-de-agente"
            value={estado.plantilla ?? undefined}
            onValueChange={(key) => {
              const elegida = plantillas.find((p) => p.key === key);
              if (elegida) elegir(elegida);
            }}
            options={plantillas.map((p) => ({
              value: p.key,
              label: p.available ? p.name : `${p.name} (no disponible)`,
              description: p.available
                ? p.description
                : `Activa la habilidad ${p.missing_skills.map(habilidadLabel).join(", ")} en Habilidades para usarlo.`,
            }))}
          />
          {plantilla?.superpowers.length ? (
            <p className="text-sm text-body">
              Superpoderes de este agente:{" "}
              <span className="text-headline">{plantilla.superpowers.map((s) => s.title).join(", ")}</span>
            </p>
          ) : null}
        </div>
      );
    }
    if ("pregunta" in paso) {
      const q = paso.pregunta;
      return (
        <RadioGroup
          label={q.text}
          name={`pregunta-${q.id}`}
          value={estado.respuestas[q.id]}
          onValueChange={(valor) => setEstado({ ...estado, respuestas: { ...estado.respuestas, [q.id]: valor } })}
          options={q.options.map((o) => ({ value: o.id, label: o.text, description: o.help || undefined }))}
        />
      );
    }
    if (paso.id === "nombre") {
      return (
        <Field
          label="Nombre del agente (opcional)"
          htmlFor="nombre-agente"
          help={`Si lo dejas vacío, se llama «${plantilla?.name ?? "como el tipo"}». Lo puedes cambiar después.`}
          className="max-w-md"
        >
          <Input
            id="nombre-agente"
            value={estado.nombre}
            maxLength={NOMBRE_MAX}
            onChange={(e) => setEstado({ ...estado, nombre: e.target.value })}
          />
        </Field>
      );
    }
    if (paso.id === "contenido") {
      return plantilla && plantilla.requirements.length > 0 ? (
        <AvisoDeRequisitos requisitos={plantilla.requirements} titulo="Para que funcione del todo, configura" />
      ) : (
        <p className="text-sm text-body">Ya tienes cargado lo que este agente necesita. No hace falta nada más.</p>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid max-w-xl grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-text-soft">Tipo</dt>
          <dd className="text-headline">{plantilla?.name}</dd>
          {pasos.flatMap((p) =>
            "pregunta" in p
              ? [
                  <dt key={`${p.id}-t`} className="text-text-soft">
                    {p.pregunta.text}
                  </dt>,
                  <dd key={`${p.id}-d`} className="text-headline">
                    {textoDeRespuesta(p.pregunta, estado)}
                  </dd>,
                ]
              : [],
          )}
          <dt className="text-text-soft">Nombre</dt>
          <dd className="text-headline">{estado.nombre.trim() || plantilla?.name}</dd>
        </dl>
        <p className="text-sm text-body">
          Se crea el borrador sin publicar. Después eliges en qué conexión atiende y lo publicas; los clientes no lo ven
          hasta que lo actives. Las frases y el modelo van con valores por defecto: los ajustas en el{" "}
          <span className="text-headline">editor avanzado</span> si quieres.
        </p>
        <AvisoDeRequisitos
          requisitos={plantilla?.requirements ?? []}
          titulo="Puedes publicar, pero tu agente no funcionará del todo hasta que configures:"
        />
        {existente && (
          <p role="alert" className="text-sm text-body">
            Ya tienes un agente de este tipo.{" "}
            <Link className="text-link underline" href={`/agentes/${existente}/editar`}>
              Editarlo
            </Link>
          </p>
        )}
      </div>
    );
  }

  return (
    <section aria-label="Asistente de creación de agentes" className="flex max-w-2xl flex-col gap-5">
      {retomado && indice > 0 && (
        <p role="status" className="text-sm text-body">
          Retomamos donde lo dejaste.{" "}
          <button
            type="button"
            className="text-link underline"
            onClick={() => {
              olvidar();
              setEstado(ESTADO_INICIAL);
              setIndice(0);
              setRetomado(false);
            }}
          >
            Empezar de nuevo
          </button>
        </p>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-text-soft" aria-live="polite">
            {plantilla ? textoDeAvance(indice, pasos.length) : "Paso 1"}
          </p>
          {plantilla && !plantilla.available && <Badge variant="warning">Falta una habilidad</Badge>}
        </div>
        <Progress
          value={plantilla ? indice + 1 : 0}
          max={pasos.length}
          label="Avance del asistente"
          valueText={plantilla ? textoDeAvance(indice, pasos.length) : "Paso 1"}
          size="sm"
        />
      </div>

      <h2 ref={titulo} tabIndex={-1} className="text-lg font-semibold text-headline outline-none">
        {paso.titulo}
      </h2>
      {"pregunta" in paso && paso.pregunta.help && <p className="text-sm text-body">{paso.pregunta.help}</p>}

      {contenidoDelPaso()}

      {error && (
        <p role="alert" className="text-sm text-status-danger-fg">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {indice > 0 && (
          <Button variant="outline" onClick={() => irA(indice - 1)} disabled={pending}>
            Atrás
          </Button>
        )}
        {ultimo ? (
          <Button variant="accent" onClick={crear} loading={pending} disabled={pending || !plantilla}>
            Crear mi agente
          </Button>
        ) : (
          <Button variant="accent" onClick={avanzar} disabled={pending}>
            Siguiente
          </Button>
        )}
        <Link className="text-sm text-link underline" href="/agentes">
          Cancelar
        </Link>
      </div>
    </section>
  );
}
