"use client";

import Link from "next/link";
import { AlertCircle, ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { FormFeedback } from "@/components/ui/form-feedback";
import { ListaDeFrases } from "@/components/ui/lista-de-frases";
import { AvisoDeRequisitos } from "@/components/domain/aviso-de-requisitos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ALCANCES_DE_MEMORIA,
  MAX_FRASES_PROPIAS,
  frasesDistintas,
  idDeSeccion,
  nombreDeSuperpoder,
  superpoderesFueraDelEnfoque,
  type AccionDelFlujo,
  type Errores,
  type EstadoDelEditor,
  type FlujoDelAgente,
} from "@/lib/agentes-editor";
import type { PublishTarget, Requirement, Superpower } from "@/lib/api/types";
import { erroresDeAcciones } from "@/lib/referencias-retiradas";
import { MAX_FRAGMENTOS, MODOS, type ConocimientoEnEditor, type ModoDeBusqueda } from "@/lib/conocimiento";
import type { Pendiente } from "@/lib/frases-pendientes";
import { canalLabel, habilidadLabel } from "@/lib/labels";
import { nombreDeAccion } from "@/lib/grupos-de-acciones";
import { agruparPorDominio } from "@/lib/superpoderes-por-dominio";
import { cn } from "@/lib/utils";

type Cambiar = (cambio: Partial<EstadoDelEditor>) => void;
/** Enlaza una lista de frases (por su id) con el texto pendiente del editor (`usePendientes`). */
type RegistrarPendiente = (id: string) => (pendiente: Pendiente | null) => void;

/** Error de un campo que no es un control único (listas, grupos): con ícono y `id` para describirlo. */
function ErrorDeCampo({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-status-danger-fg">
      <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      {mensaje}
    </p>
  );
}

function Avanzado({ children, titulo = "Opciones avanzadas" }: { children: React.ReactNode; titulo?: string }) {
  return (
    <details className="rounded-md border border-border-soft px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-headline">{titulo}</summary>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
  );
}

// ------------------------------------------------------------------ 1. identidad
export function PasoIdentidad({
  estado,
  cambiar,
  errores,
}: {
  estado: EstadoDelEditor;
  cambiar: Cambiar;
  errores: Errores;
}) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Field label="Nombre" htmlFor="agente-nombre" required error={errores.name}>
        <Input id="agente-nombre" value={estado.nombre} maxLength={120} onChange={(e) => cambiar({ nombre: e.target.value })} />
      </Field>
      <Field
        label="Para qué sirve"
        htmlFor="agente-descripcion"
        help="Una frase para tu equipo. Los clientes no la ven."
        error={errores.description}
      >
        <Textarea
          id="agente-descripcion"
          value={estado.descripcion}
          maxLength={1000}
          rows={2}
          onChange={(e) => cambiar({ descripcion: e.target.value })}
        />
      </Field>
    </div>
  );
}

// ------------------------------------------------------------------ 2. cómo habla
export function PasoVoz({
  estado,
  cambiar,
  errores,
  registrarPendiente,
  vozDelNegocio,
}: {
  estado: EstadoDelEditor;
  cambiar: Cambiar;
  errores: Errores;
  registrarPendiente?: RegistrarPendiente;
  /** «Cercano · calidez 4 · pocos emojis»: la voz que el negocio fijó en Configuración. */
  vozDelNegocio: string | null;
}) {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1 rounded-md border border-border-soft bg-surface p-4">
        <p className="text-sm font-medium text-headline">La voz de tu negocio</p>
        <p className="text-sm text-body">
          {vozDelNegocio ?? "No pudimos leer la voz de tu negocio."}{" "}
          <Link href="/configuracion?seccion=voz" className="text-link underline-offset-2 hover:underline">
            Cambiar en Configuración
          </Link>
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Switch
          id="agente-voz"
          checked={estado.heredarVoz}
          onCheckedChange={(valor) => cambiar({ heredarVoz: valor })}
          aria-describedby="agente-voz-ayuda"
        />
        <div>
          <label htmlFor="agente-voz" className="text-sm font-medium text-headline">
            Hablar con la voz de la conexión
          </label>
          <p id="agente-voz-ayuda" className="text-sm text-text-soft">
            Usa el tono, la calidez y los emojis que configuraste para cada canal.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="agente-prohibidas" className="text-sm font-medium text-headline">
          Frases que el agente nunca dice
        </label>
        <ListaDeFrases
          id="agente-prohibidas"
          frases={estado.frasesProhibidas}
          onChange={(frasesProhibidas) => cambiar({ frasesProhibidas })}
          placeholder="Por ejemplo: te lo regalo"
          agregarLabel="Agregar frase"
          max={100}
          onPendiente={registrarPendiente?.("agente-prohibidas")}
          invalido={Boolean(errores["persona.forbiddenPhrases"])}
          describedBy={errores["persona.forbiddenPhrases"] ? "agente-prohibidas-error" : undefined}
        />
        <ErrorDeCampo id="agente-prohibidas-error" mensaje={errores["persona.forbiddenPhrases"]} />
      </div>
      <Avanzado>
        <Field
          label="Largo máximo de cada respuesta (caracteres)"
          htmlFor="agente-largo"
          help="0 = sin tope. Si se pasa, el agente lo intenta de nuevo más corto."
          error={errores["persona.maxLength"]}
        >
          <InputNumero
            id="agente-largo"
            min={0}
            max={10000}
            value={estado.largoMaximo}
            onValueChange={(largoMaximo) => cambiar({ largoMaximo })}
            className="max-w-40"
          />
        </Field>
      </Avanzado>
    </div>
  );
}

// ------------------------------------------------------------------ 3. horario y reglas
export function PasoReglas({ horario, motivos }: { horario: string | null; motivos: string[] | null }) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
        El horario y cuándo pasar a una persona son de todo el negocio: aplican a todos tus agentes.
      </p>
      <dl className="flex flex-col gap-3 rounded-md border border-border-soft bg-surface p-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-text-soft">Atiende tu equipo</dt>
          <dd className="text-headline">{horario === null ? "No pudimos leer el horario." : horario || "Sin horario definido"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-text-soft">Pasa a una persona si</dt>
          <dd className="text-headline">
            {motivos === null ? "No pudimos leer las reglas." : motivos.length ? motivos.join(", ") : "Aún sin reglas"}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-text-soft">
        Tu agente responde las 24 horas; el horario le dice cuándo te pueden atender.{" "}
        <Link href="/configuracion?seccion=horario" className="text-link underline-offset-2 hover:underline">
          Cambiar en Configuración
        </Link>
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ 4. habilidades: superpoderes
export function PasoSuperpoderes({
  estado,
  cambiar,
  errores,
  erroresPorPoder,
  catalogo,
  minFrases,
  requisitos = [],
  registrarPendiente,
  nombreDeHabilidad = habilidadLabel,
  interruptor = false,
  soloLectura = false,
}: {
  estado: EstadoDelEditor;
  cambiar: Cambiar;
  errores: Errores;
  erroresPorPoder: Record<string, string>;
  catalogo: Superpower[];
  minFrases: number;
  requisitos?: Requirement[];
  registrarPendiente?: RegistrarPendiente;
  /** Nombre legible del pack de origen (`Superpower.skill`), para «De la habilidad …» (HU-UX-09). */
  nombreDeHabilidad?: (skill: string) => string;
  /** Interruptor en lugar de casilla: la pestaña Superpoderes de la ficha (HU-UX-09). */
  interruptor?: boolean;
  /** Sin permiso de edición: se ve qué tiene, sin cambiarlo. */
  soloLectura?: boolean;
}) {
  function poner(id: string, cambio: Partial<{ activo: boolean; frases: string[] }>) {
    const actual = estado.superpoderes[id] ?? { activo: false, frases: [] };
    cambiar({ superpoderes: { ...estado.superpoderes, [id]: { ...actual, ...cambio } } });
  }
  const fuera = superpoderesFueraDelEnfoque(estado, catalogo);
  if (catalogo.length === 0 && fuera.length === 0) {
    return <p className="text-sm text-body">Tu negocio no tiene habilidades con superpoderes activas todavía.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Marca lo que este agente sabe hacer. Cada superpoder necesita al menos {minFrases} frases distintas de clientes para
        reconocerlo: las de la habilidad ya cuentan y puedes sumar las tuyas.
      </p>
      <ErrorDeCampo id="superpoderes-error" mensaje={errores.procedures} />
      {erroresDeAcciones(errores).map((mensaje, i) => (
        <ErrorDeCampo key={mensaje} id={`acciones-error-${i}`} mensaje={mensaje} />
      ))}
      <AvisoDeRequisitos requisitos={requisitos} />
      {fuera.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Superpoderes que no corresponden a este agente">
          {fuera.map((id) => (
            <li key={id} className="flex flex-col gap-2 rounded-md border border-status-warning-border bg-status-warning-bg p-4">
              <p className="text-sm font-medium text-headline">{nombreDeSuperpoder(id)}</p>
              <p className="text-sm text-body">
                Ya no está disponible para este agente. Quítalo para poder publicar.
              </p>
              <ErrorDeCampo id={`poder-${id}-error`} mensaje={erroresPorPoder[id]} />
              <div>
                <Button type="button" variant="outline" size="sm" disabled={soloLectura} onClick={() => poner(id, { activo: false })}>
                  Quitar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* SPEC-48, HU-AOS-83: una tarjeta por dominio («Ventas», «Formas de pago»…), no poderes sueltos. */}
      <div className="flex flex-col gap-5">
        {agruparPorDominio(catalogo).map((dominio) => (
          <section
            key={dominio.key}
            aria-labelledby={`dominio-${dominio.key}`}
            className="flex flex-col gap-3 rounded-md border border-border-soft p-4"
            data-dominio={dominio.key}
          >
            <h3 id={`dominio-${dominio.key}`} className="text-sh-block font-display text-headline">
              {dominio.label}
            </h3>
            <ul className="flex flex-col gap-3">
              {dominio.items.map((poder) => {
                const enEditor = estado.superpoderes[poder.id] ?? { activo: false, frases: [] };
                const error = erroresPorPoder[poder.id];
                const total = frasesDistintas(poder, enEditor.frases);
                const idError = `poder-${poder.id}-error`;
                return (
                  <li key={poder.id} className="rounded-md border border-border-soft p-4">
                    {interruptor ? (
                      <div className="flex items-start gap-3">
                        <Switch
                          id={`poder-${poder.id}`}
                          aria-label={poder.title}
                          checked={enEditor.activo}
                          disabled={soloLectura}
                          onCheckedChange={(activo) => poner(poder.id, { activo })}
                        />
                        <p className="text-sm font-medium text-headline">{poder.title}</p>
                      </div>
                    ) : (
                      <Checkbox
                        id={`poder-${poder.id}`}
                        label={poder.title}
                        checked={enEditor.activo}
                        disabled={soloLectura}
                        onCheckedChange={(activo) => poner(poder.id, { activo })}
                      />
                    )}
                    {poder.description && <p className={cn("mt-1 text-sm text-text-soft", interruptor ? "pl-12" : "pl-7")}>{poder.description}</p>}
                    <p className={cn("mt-1 text-xs text-text-soft", interruptor ? "pl-12" : "pl-7")}>
                      De la habilidad {nombreDeHabilidad(poder.skill)}
                    </p>
                    {enEditor.activo && soloLectura && (
                      <ul className={cn("mt-3 flex flex-wrap gap-2", interruptor ? "pl-12" : "pl-7")} aria-label={`Frases de ${poder.title}`}>
                        {[...new Set([...poder.phrases, ...enEditor.frases])].map((frase) => (
                          <li key={frase} className="rounded-sm border border-border-soft px-2 py-1 text-sm text-body">
                            {frase}
                          </li>
                        ))}
                      </ul>
                    )}
                    {enEditor.activo && !soloLectura && (
                      <div className={cn("mt-3 flex flex-col gap-3", interruptor ? "pl-12" : "pl-7")}>
                        <div className="flex flex-col gap-1.5">
                          <p className="text-sm font-medium text-headline">Frases sugeridas de la habilidad</p>
                          <ul className="flex flex-wrap gap-2">
                            {poder.phrases.map((frase) => (
                              <li key={frase} className="rounded-sm border border-border-soft px-2 py-1 text-sm text-body">
                                {frase}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`poder-${poder.id}-frase`} className="text-sm font-medium text-headline">
                            Tus frases
                          </label>
                          <ListaDeFrases
                            id={`poder-${poder.id}-frase`}
                            frases={enEditor.frases}
                            onChange={(frases) => poner(poder.id, { frases })}
                            placeholder="Cómo lo pide un cliente tuyo"
                            agregarLabel="Agregar frase"
                            max={MAX_FRASES_PROPIAS}
                            onPendiente={registrarPendiente?.(`poder-${poder.id}-frase`)}
                            invalido={Boolean(error)}
                            describedBy={error ? idError : undefined}
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant={total >= minFrases ? "success" : "warning"}>
                              {total} frases (mínimo {minFrases})
                            </Badge>
                          </div>
                          <ErrorDeCampo id={idError} mensaje={error} />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 4. memoria
export function PasoMemoria({
  estado,
  cambiar,
  errores,
  agenteId,
}: {
  estado: EstadoDelEditor;
  cambiar: Cambiar;
  errores: Errores;
  agenteId: string;
}) {
  function alternar(id: string, activo: boolean) {
    cambiar({ alcances: activo ? [...new Set([...estado.alcances, id])] : estado.alcances.filter((a) => a !== id) });
  }
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <fieldset className="flex flex-col gap-2" aria-describedby={errores["memory.readScopes"] ? "memoria-error" : undefined}>
        <legend className="mb-1 text-sm font-medium text-headline">Qué puede recordar</legend>
        {ALCANCES_DE_MEMORIA.map((alcance) => (
          <Checkbox
            key={alcance.id}
            id={`memoria-${alcance.id}`}
            label={alcance.label}
            checked={estado.alcances.includes(alcance.id)}
            onCheckedChange={(activo) => alternar(alcance.id, activo)}
          />
        ))}
        <ErrorDeCampo id="memoria-error" mensaje={errores["memory.readScopes"]} />
      </fieldset>
      <Avanzado>
        <Field
          label="Mensajes recientes que tiene presentes"
          htmlFor="memoria-turnos"
          help="Entre 1 y 500. Más mensajes = más contexto y más costo."
          error={errores["memory.shortTermTurns"]}
        >
          <InputNumero
            id="memoria-turnos"
            min={1}
            max={500}
            value={estado.turnosDeMemoria}
            onValueChange={(turnosDeMemoria) => cambiar({ turnosDeMemoria })}
            className="max-w-32"
          />
        </Field>
      </Avanzado>
      <SeccionConocimiento
        conocimiento={estado.conocimiento}
        cambiar={(cambio) => cambiar({ conocimiento: { ...estado.conocimiento, ...cambio } })}
        agenteId={agenteId}
        errores={errores}
      />
    </div>
  );
}

/** Documentos del negocio (HU-AOS-49): activar la búsqueda y ajustarla. */
function SeccionConocimiento({
  conocimiento,
  cambiar,
  agenteId,
  errores,
}: {
  conocimiento: ConocimientoEnEditor;
  cambiar: (cambio: Partial<ConocimientoEnEditor>) => void;
  agenteId: string;
  errores: Errores;
}) {
  const umbralPropio = conocimiento.umbral !== null;
  return (
    <section aria-labelledby="conocimiento-titulo" className="flex flex-col gap-4 border-t border-border-soft pt-4">
      <h3 id="conocimiento-titulo" className="text-sm font-medium text-headline">
        Documentos del negocio
      </h3>
      <div className="flex items-start gap-3">
        <Switch
          id="conocimiento-activo"
          checked={conocimiento.activo}
          onCheckedChange={(activo) => cambiar({ activo })}
          aria-describedby="conocimiento-ayuda"
        />
        <div>
          <label htmlFor="conocimiento-activo" className="text-sm font-medium text-headline">
            Responder con los documentos que le subas
          </label>
          <p id="conocimiento-ayuda" className="text-sm text-text-soft">
            Busca en tus preguntas frecuentes, catálogos y políticas antes de responder, y cita de dónde sale el dato.
            Los documentos se suben en{" "}
            <Link href={`/agentes/${agenteId}?tab=sabe`} className="text-link underline underline-offset-2">
              Lo que sabe › Conocimiento
            </Link>
            .
          </p>
        </div>
      </div>
      {conocimiento.activo && (
        <>
          <RadioGroup
            label="Cómo busca"
            name="conocimiento-modo"
            options={MODOS}
            value={conocimiento.modo}
            onValueChange={(modo) => cambiar({ modo: modo as ModoDeBusqueda })}
          />
          <Avanzado titulo="Ajustes de la búsqueda">
            <Field
              label="Fragmentos que usa por respuesta"
              htmlFor="conocimiento-fragmentos"
              help={`Entre 1 y ${MAX_FRAGMENTOS}. Más fragmentos = más contexto y más costo por respuesta.`}
              error={errores["knowledge.topK"]}
            >
              <InputNumero
                id="conocimiento-fragmentos"
                min={1}
                max={MAX_FRAGMENTOS}
                value={conocimiento.fragmentos}
                onValueChange={(fragmentos) => cambiar({ fragmentos })}
                className="max-w-32"
              />
            </Field>
            <div className="flex items-start gap-3">
              <Switch
                id="conocimiento-umbral-propio"
                checked={umbralPropio}
                onCheckedChange={(propio) => cambiar({ umbral: propio ? 0.45 : null })}
                aria-describedby="conocimiento-umbral-ayuda"
              />
              <div>
                <label htmlFor="conocimiento-umbral-propio" className="text-sm font-medium text-headline">
                  Fijar la similitud mínima
                </label>
                <p id="conocimiento-umbral-ayuda" className="text-sm text-text-soft">
                  Apagado, usa el valor calibrado para cada modo (recomendado).
                </p>
              </div>
            </div>
            {umbralPropio && (
              <Field
                label="Similitud mínima (0 a 1)"
                htmlFor="conocimiento-umbral"
                help="Más alto = menos fragmentos y solo los muy parecidos a la pregunta."
                error={errores["knowledge.minScore"]}
              >
                <InputNumero
                  id="conocimiento-umbral"
                  decimal
                  min={0}
                  max={1}
                  step={0.05}
                  value={conocimiento.umbral ?? 0}
                  onValueChange={(umbral) => cambiar({ umbral })}
                  className="max-w-32"
                />
              </Field>
            )}
          </Avanzado>
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ 5. publicar
export function PasoPublicar({
  destinos,
  destinosError,
  elegidas,
  alternar,
  errores,
  notas,
  setNotas,
  requisitos = [],
  modelo = null,
}: {
  destinos: PublishTarget[];
  destinosError: string | null;
  elegidas: string[];
  alternar: (id: string, activo: boolean) => void;
  errores: Errores;
  notas: string;
  setNotas: (notas: string) => void;
  requisitos?: Requirement[];
  /** Modelo con el que atenderá y de dónde sale (HU-AOS-79). Solo se muestra: el dueño no lo elige aquí. */
  modelo?: { nombre: string; origen: "negocio" | "agente" } | null;
}) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      {modelo && (
        <p className="text-sm text-body">
          {modelo.origen === "negocio" ? "Usa el modelo de tu negocio: " : "Usa el modelo fijado para este agente: "}
          <span className="font-medium text-headline">{modelo.nombre}</span>.{" "}
          <Link href="/configuracion" className="text-link underline-offset-2 hover:underline">
            Cambiar en Configuración
          </Link>
        </p>
      )}
      <AvisoDeRequisitos
        requisitos={requisitos}
        titulo="Puedes publicar, pero tu agente no funcionará del todo hasta que configures:"
      />
      <p className="text-sm text-body">
        Un agente siempre se publica en al menos una conexión. Al publicar se prepara una versión nueva de cada conexión
        elegida; tus clientes no la ven hasta que la actives.
      </p>
      {destinosError ? (
        <FormFeedback error={<>No se pudieron cargar las conexiones: {destinosError}</>} />
      ) : destinos.length === 0 ? (
        <p className="text-sm text-body">
          No tienes conexiones listas para agentes. Conecta un canal en Conexiones y vuelve aquí para publicar.
        </p>
      ) : (
        <fieldset className="flex flex-col gap-2" aria-describedby={errores.connection_ids ? "conexiones-error" : undefined}>
          <legend className="mb-1 text-sm font-medium text-headline">Conexiones donde atiende</legend>
          {destinos.map((d, i) => {
            const error = errores[`connection_ids[${elegidas.indexOf(d.connection_id)}]`];
            return (
              <div key={d.connection_id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`conexion-${i}`}
                    label={`${d.label || canalLabel(d.channel)}${d.label ? ` · ${canalLabel(d.channel)}` : ""}`}
                    checked={elegidas.includes(d.connection_id)}
                    disabled={!d.covers_skills}
                    onCheckedChange={(activo) => alternar(d.connection_id, activo)}
                  />
                  {d.installed && <Badge variant="info">Ya instalado</Badge>}
                </div>
                {!d.covers_skills && (
                  <p className="pl-7 text-sm text-text-soft">
                    Le faltan habilidades: {d.missing_skills.map(habilidadLabel).join(", ")}.
                  </p>
                )}
                {elegidas.includes(d.connection_id) && <ErrorDeCampo id={`conexion-${i}-error`} mensaje={error} />}
              </div>
            );
          })}
          <ErrorDeCampo id="conexiones-error" mensaje={errores.connection_ids} />
        </fieldset>
      )}
      <Field label="Qué cambió (opcional)" htmlFor="publicar-notas" help="Queda en el historial de versiones.">
        <Textarea id="publicar-notas" value={notas} maxLength={2000} rows={2} onChange={(e) => setNotas(e.target.value)} />
      </Field>
    </div>
  );
}


// ------------------------------------------------------------------ flujo de atención
/** Editor del flujo del agente (ADR-0195, HU-AOS-76): secciones y acciones, sin tocar el AgentSpec. */
export function PasoFlujo({
  flujo,
  acciones,
  cambiar,
  errores,
  semilla,
}: {
  flujo: FlujoDelAgente;
  acciones: AccionDelFlujo[];
  cambiar: (flujo: FlujoDelAgente) => void;
  errores: Errores;
  /** true cuando el flujo que se muestra es la semilla del pack y aún no se guardó. */
  semilla: boolean;
}) {
  const disponibles = acciones.filter((a) => a.enabled || a.by_superpower);

  function conSeccion(i: number, cambio: Partial<FlujoDelAgente["sections"][number]>) {
    cambiar({ sections: flujo.sections.map((s, j) => (j === i ? { ...s, ...cambio } : s)) });
  }

  function mover(i: number, delta: number) {
    const destino = i + delta;
    if (destino < 0 || destino >= flujo.sections.length) return;
    const copia = [...flujo.sections];
    [copia[i], copia[destino]] = [copia[destino], copia[i]];
    cambiar({ sections: copia });
  }

  function quitar(i: number) {
    cambiar({ sections: flujo.sections.filter((_, j) => j !== i) });
  }

  function agregarSeccion() {
    const id = idDeSeccion("Nueva sección", flujo.sections.map((s) => s.id));
    cambiar({ sections: [...flujo.sections, { id, label: "Nueva sección", purpose: "", tools: [] }] });
  }

  function agregarAccion(i: number, tool: string) {
    if (!tool || flujo.sections[i]?.tools.includes(tool)) return;
    conSeccion(i, { tools: [...flujo.sections[i].tools, tool] });
  }

  function quitarAccion(i: number, tool: string) {
    conSeccion(i, { tools: flujo.sections[i].tools.filter((t) => t !== tool) });
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-body">
        Estos son los pasos con los que atiende este agente. Cada sección agrupa las acciones de ese momento; solo
        puedes elegir acciones que el agente tenga encendidas o que le conceda un superpoder.
      </p>
      {semilla && (
        <p className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
          Partimos del flujo sugerido de su habilidad. Puedes cambiarlo: este agente es independiente de los demás.
        </p>
      )}
      {flujo.sections.length === 0 && <p className="text-sm text-text-soft">Todavía no hay secciones. Agrega la primera.</p>}
      {flujo.sections.map((seccion, i) => {
        const libres = disponibles.filter((a) => !seccion.tools.includes(a.tool));
        return (
          <section key={seccion.id} className="flex flex-col gap-3 rounded-md border border-border-soft p-4">
            <div className="flex items-start gap-2">
              <span className="mt-2 w-6 shrink-0 text-xs text-text-soft tabular-nums">{i + 1}.</span>
              <Field label="Nombre de la sección" htmlFor={`flujo-label-${i}`} error={errores[`flow.sections[${i}].label`]} className="flex-1">
                <Input
                  id={`flujo-label-${i}`}
                  value={seccion.label}
                  maxLength={80}
                  onChange={(e) => conSeccion(i, { label: e.target.value })}
                />
              </Field>
              <div className="mt-7 flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Subir sección" disabled={i === 0} onClick={() => mover(i, -1)}>
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Bajar sección"
                  disabled={i === flujo.sections.length - 1}
                  onClick={() => mover(i, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Quitar sección" onClick={() => quitar(i)}>
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
            <Field label="Para qué es" htmlFor={`flujo-purpose-${i}`} help="Una frase que el agente usa para saber qué hacer en esta etapa.">
              <Textarea
                id={`flujo-purpose-${i}`}
                rows={2}
                maxLength={500}
                value={seccion.purpose}
                onChange={(e) => conSeccion(i, { purpose: e.target.value })}
              />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-headline">Acciones de esta sección</span>
              {seccion.tools.length === 0 ? (
                <p className="text-xs text-text-soft">Sin acciones: la sección solo guía la conversación.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {seccion.tools.map((tool) => (
                    <li key={tool} className="flex items-center gap-1 rounded-full border border-border-soft bg-surface px-3 py-1 text-xs">
                      <span>{nombreDeAccion(tool)}</span>
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
                        aria-label={`Quitar ${nombreDeAccion(tool)}`}
                        onClick={() => quitarAccion(i, tool)}
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Agregar acción" htmlFor={`flujo-add-${i}`} className="min-w-56 flex-1">
                  <Select
                    id={`flujo-add-${i}`}
                    value=""
                    onChange={(e) => {
                      agregarAccion(i, e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Elige una acción…</option>
                    {libres.map((a) => (
                      <option key={a.tool} value={a.tool}>
                        {nombreDeAccion(a.tool)}
                        {a.by_superpower && !a.enabled ? " (la concede un superpoder)" : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </section>
        );
      })}
      <div>
        <Button type="button" variant="outline" onClick={agregarSeccion}>
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          Agregar sección
        </Button>
      </div>
    </div>
  );
}
