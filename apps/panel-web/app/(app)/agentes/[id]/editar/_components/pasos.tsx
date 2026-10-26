"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

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
  nombreDeSuperpoder,
  superpoderesFueraDelEnfoque,
  textoDeCosto,
  type Errores,
  type EstadoDelEditor,
} from "@/lib/agentes-editor";
import type { LlmModelCatalog, PublishTarget, Requirement, Superpower } from "@/lib/api/types";
import { MAX_FRAGMENTOS, MODOS, type ConocimientoEnEditor, type ModoDeBusqueda } from "@/lib/conocimiento";
import type { Pendiente } from "@/lib/frases-pendientes";
import { formatUsd } from "@/lib/format";
import { canalLabel, habilidadLabel } from "@/lib/labels";

type Cambiar = (cambio: Partial<EstadoDelEditor>) => void;
/** Enlaza una lista de frases (por su id) con el texto pendiente del editor (`usePendientes`). */
type RegistrarPendiente = (id: string) => (pendiente: Pendiente | null) => void;

const PROVEEDORES: Record<string, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openai_compatible: "Compatible con OpenAI",
};

function nombreDeProveedor(id: string): string {
  return PROVEEDORES[id] ?? id;
}

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
  registrarPendiente,
}: {
  estado: EstadoDelEditor;
  cambiar: Cambiar;
  errores: Errores;
  registrarPendiente?: RegistrarPendiente;
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
      </Avanzado>
    </div>
  );
}

// ------------------------------------------------------------------ 2. modelo
export function PasoModelo({
  estado,
  cambiar,
  errores,
  catalogo,
}: {
  estado: EstadoDelEditor;
  cambiar: Cambiar;
  errores: Errores;
  catalogo: LlmModelCatalog;
}) {
  const elegido = catalogo.items.find((m) => m.model === estado.modelo);
  const fueraDeTabla = estado.modelo && !elegido;
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="text-sm text-body">
        Tu negocio usa <strong className="text-headline">{nombreDeProveedor(catalogo.provider)}</strong>. Elige uno de sus
        modelos: los más caros entienden mejor los casos difíciles.
      </p>
      {catalogo.byok_model && (
        <p className="rounded-md bg-status-info-bg px-3 py-2 text-sm text-status-info-fg">
          En Configuración fijaste el modelo {catalogo.byok_model}: ese manda sobre el que elijas aquí.
        </p>
      )}
      <Field label="Modelo" htmlFor="agente-modelo" required error={errores["model.primary"]}>
        <Select id="agente-modelo" value={estado.modelo} onChange={(e) => cambiar({ modelo: e.target.value })}>
          {fueraDeTabla && <option value={estado.modelo}>{estado.modelo} (configurado a mano)</option>}
          {catalogo.items.map((m) => (
            <option key={m.model} value={m.model} disabled={!m.selectable}>
              {nombreDeProveedor(m.provider)} · {m.model}
              {m.retired ? " (retirado)" : !m.selectable ? " (otro proveedor)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      {elegido && (
        <dl className="grid grid-cols-1 gap-3 rounded-md border border-border-soft p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-text-soft">Lectura</dt>
            <dd className="text-headline tabular-nums">{formatUsd(elegido.input_usd_per_mtok)} / millón de tokens</dd>
          </div>
          <div>
            <dt className="text-text-soft">Escritura</dt>
            <dd className="text-headline tabular-nums">{formatUsd(elegido.output_usd_per_mtok)} / millón de tokens</dd>
          </div>
          <div>
            <dt className="text-text-soft">Costo estimado</dt>
            <dd className="text-headline">{textoDeCosto(elegido.estimated_usd_per_1000_turns)}</dd>
          </div>
        </dl>
      )}
      {catalogo.sample_turns > 0 && (
        <p className="text-xs text-text-soft">
          Estimado con el promedio de {catalogo.sample_turns} respuestas de tu negocio en los últimos 30 días.
        </p>
      )}
      <Avanzado>
        <Field
          label="Creatividad (temperatura)"
          htmlFor="agente-temperatura"
          help="Entre 0 (siempre igual) y 2 (más variado). Recomendado: 0,3."
          error={errores["model.temperature"]}
        >
          <InputNumero
            id="agente-temperatura"
            decimal
            step={0.1}
            min={0}
            max={2}
            value={estado.temperatura}
            onValueChange={(temperatura) => cambiar({ temperatura })}
            className="max-w-32"
          />
        </Field>
      </Avanzado>
    </div>
  );
}

// ------------------------------------------------------------------ 3. superpoderes
export function PasoSuperpoderes({
  estado,
  cambiar,
  errores,
  erroresPorPoder,
  catalogo,
  minFrases,
  requisitos = [],
  registrarPendiente,
}: {
  estado: EstadoDelEditor;
  cambiar: Cambiar;
  errores: Errores;
  erroresPorPoder: Record<string, string>;
  catalogo: Superpower[];
  minFrases: number;
  requisitos?: Requirement[];
  registrarPendiente?: RegistrarPendiente;
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
                <Button type="button" variant="outline" size="sm" onClick={() => poner(id, { activo: false })}>
                  Quitar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ul className="flex flex-col gap-3">
        {catalogo.map((poder) => {
          const enEditor = estado.superpoderes[poder.id] ?? { activo: false, frases: [] };
          const error = erroresPorPoder[poder.id];
          const total = frasesDistintas(poder, enEditor.frases);
          const idError = `poder-${poder.id}-error`;
          return (
            <li key={poder.id} className="rounded-md border border-border-soft p-4">
              <Checkbox
                id={`poder-${poder.id}`}
                label={poder.title}
                checked={enEditor.activo}
                onCheckedChange={(activo) => poner(poder.id, { activo })}
              />
              {poder.description && <p className="mt-1 pl-7 text-sm text-text-soft">{poder.description}</p>}
              {enEditor.activo && (
                <div className="mt-3 flex flex-col gap-3 pl-7">
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
            Los documentos se suben en la{" "}
            <Link href={`/agentes/${agenteId}?tab=conocimiento`} className="text-link underline underline-offset-2">
              pestaña Conocimiento
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
}: {
  destinos: PublishTarget[];
  destinosError: string | null;
  elegidas: string[];
  alternar: (id: string, activo: boolean) => void;
  errores: Errores;
  notas: string;
  setNotas: (notas: string) => void;
  requisitos?: Requirement[];
}) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <AvisoDeRequisitos
        requisitos={requisitos}
        titulo="Puedes publicar, pero tu agente no funcionará del todo hasta que configures:"
      />
      <p className="text-sm text-body">
        Un agente siempre se publica en al menos una conexión. Al publicar se prepara una versión nueva de cada conexión
        elegida; tus clientes no la ven hasta que la actives.
      </p>
      {destinosError ? (
        <p role="alert" className="text-sm text-status-danger-fg">
          No se pudieron cargar las conexiones: {destinosError}
        </p>
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
