"use client";

import { useMemo, useState } from "react";

import {
  PasoIdentidad,
  PasoMemoria,
  PasoModelo,
  PasoPublicar,
  PasoSuperpoderes,
} from "@/app/(app)/agentes/[id]/editar/_components/pasos";
import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Stepper, type StepItem } from "@/components/ui/stepper";
import {
  PASOS,
  contenidoDesdeEstado,
  erroresDelPaso,
  erroresPorSuperpoder,
  estadoDesdeBorrador,
  pasoDelCampo,
  textoDeConexionPublicada,
  type Contenido,
  type Errores,
  type EstadoDelEditor,
  type PasoId,
} from "@/lib/agentes-editor";
import type {
  AgentDetail,
  EditorPublishOut,
  LlmModelCatalog,
  PublishTarget,
  Requirement,
  Superpower,
} from "@/lib/api/types";
import { usePendientes } from "@/lib/frases-pendientes";
import { esLimiteDePlan } from "@/lib/plan-limite";
import { useAction } from "@/lib/use-action";

/** Id de la lista de frases prohibidas (la del paso Identidad), el mismo que usa `pasos.tsx`. */
const ID_PROHIBIDAS = "agente-prohibidas";

type Respuesta = { error?: string; code?: string; fields?: Record<string, string> };

/**
 * Editor por pasos de un agente especialista (HU-AOS-24): identidad, proveedor y modelo,
 * superpoderes, memoria y publicar. Avanzar guarda el borrador; publicar valida todo, publica en
 * las conexiones elegidas (D-35) y deja la versión lista para activar, sin activarla.
 */
export function EditorDeAgente({
  agente,
  superpoderes,
  modelos,
  destinos,
  destinosError,
  puedeActivar,
  requisitos = [],
  pasoInicial = "identidad",
}: {
  agente: AgentDetail;
  superpoderes: Superpower[];
  modelos: LlmModelCatalog;
  destinos: PublishTarget[];
  destinosError: string | null;
  puedeActivar: boolean;
  /** Lo que falta configurar para este enfoque (aviso, no bloquea). */
  requisitos?: Requirement[];
  /** Paso con el que abre (el asistente de creación entra directo a publicar, HU-AOS-54). */
  pasoInicial?: PasoId;
}) {
  const confirm = useConfirm();
  const guardarAccion = useAction({ refresh: false });
  const publicarAccion = useAction({ refresh: false });
  const activarAccion = useAction();

  const [base, setBase] = useState<Contenido>(agente.draft.content);
  const [lock, setLock] = useState(agente.draft.lock_version);
  const [guardado, setGuardado] = useState(() => estadoDesdeBorrador(agente, agente.draft.content, superpoderes));
  const [estado, setEstado] = useState<EstadoDelEditor>(guardado);
  const [paso, setPaso] = useState<PasoId>(pasoInicial);
  const [visitados, setVisitados] = useState<Set<PasoId>>(new Set(["identidad", pasoInicial]));
  const [errores, setErrores] = useState<Errores>({});
  const [limite, setLimite] = useState<string | null>(null);
  const [elegidas, setElegidas] = useState<string[]>(
    destinos.filter((d) => d.covers_skills && (d.installed || destinos.length === 1)).map((d) => d.connection_id),
  );
  const [notas, setNotas] = useState("");
  const [publicado, setPublicado] = useState<EditorPublishOut | null>(null);
  const [activadas, setActivadas] = useState<Set<string>>(new Set());
  const pendientes = usePendientes();
  // Avisos de texto escrito y no agregado en una lista, por id de la lista.
  const [avisos, setAvisos] = useState<Record<string, string>>({});

  const minFrases = modelos.min_phrases;
  const cambios = JSON.stringify(estado) !== JSON.stringify(guardado);
  const contenido = useMemo(() => contenidoDesdeEstado(base, estado, superpoderes), [base, estado, superpoderes]);
  const porPoder = useMemo(() => erroresPorSuperpoder(errores, contenido), [errores, contenido]);

  function cambiar(cambio: Partial<EstadoDelEditor>) {
    setEstado((actual) => ({ ...actual, ...cambio }));
    setAvisos({});
  }

  function validar(id: PasoId, actual: EstadoDelEditor = estado): Errores {
    return erroresDelPaso(id, actual, superpoderes, { minFrases, conexiones: elegidas });
  }

  /**
   * Suma a su lista el texto escrito y no agregado (frases prohibidas y frases de superpoderes) y
   * devuelve el estado completo; es el que hay que validar y guardar, porque `estado` aún no lo trae.
   * Si alguna frase no cabe (muy corta o lista llena) avisa junto al campo y devuelve null.
   */
  function plegarPendientes(): EstadoDelEditor | null {
    const dePoder = (id: string) => /^poder-(.+)-frase$/.exec(id)?.[1];
    const pendiente = pendientes.completar((id) => {
      if (id === ID_PROHIBIDAS) return estado.frasesProhibidas;
      const poder = dePoder(id);
      return poder ? estado.superpoderes[poder]?.frases : undefined;
    });
    setAvisos(pendiente.errores);
    if (Object.keys(pendiente.errores).length > 0) return null;
    let completo = estado;
    for (const [id, frases] of Object.entries(pendiente.listas)) {
      const poder = dePoder(id);
      completo = poder
        ? { ...completo, superpoderes: { ...completo.superpoderes, [poder]: { ...completo.superpoderes[poder], frases } } }
        : { ...completo, frasesProhibidas: frases };
    }
    if (completo !== estado) setEstado(completo);
    pendiente.limpiar();
    return completo;
  }

  /** Guarda nombre, descripción y borrador si cambiaron. Devuelve el `lock_version` vigente o null. */
  async function guardar(actual: EstadoDelEditor = estado): Promise<number | null> {
    if (JSON.stringify(actual) === JSON.stringify(guardado)) return lock;
    const resultado: { lock: number | null } = { lock: null };
    const ok = await guardarAccion.run(async () => {
      if (actual.nombre !== guardado.nombre || actual.descripcion !== guardado.descripcion) {
        const res = await fetch(`/api/agent-editor/${agente.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: actual.nombre, description: actual.descripcion }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as Respuesta;
          return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar el nombre." };
        }
      }
      const res = await fetch(`/api/agent-editor/${agente.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contenidoDesdeEstado(base, actual, superpoderes), lock_version: lock }),
      });
      const json = (await res.json().catch(() => ({}))) as Respuesta & { lockVersion?: number; content?: Contenido };
      if (!res.ok) {
        if (json.fields) mostrarErrores(json.fields);
        const error =
          json.code === "stale_lock_version"
            ? "Otra persona guardó este agente mientras lo editabas. Recarga la página para ver sus cambios."
            : (json.error ?? "No se pudo guardar el borrador.");
        return { ok: false, status: res.status, error };
      }
      resultado.lock = json.lockVersion ?? lock;
      setLock(resultado.lock);
      if (json.content) setBase(json.content);
      setGuardado(actual);
      return { ok: true, success: "Borrador guardado." };
    });
    return ok ? resultado.lock : null;
  }

  function mostrarErrores(campos: Errores) {
    setErrores(campos);
    const primero = Object.keys(campos)[0];
    if (primero) irA(pasoDelCampo(primero));
  }

  function irA(id: PasoId) {
    setPaso(id);
    setVisitados((v) => new Set([...v, id]));
  }

  async function siguiente() {
    const completo = plegarPendientes();
    if (!completo) return;
    const propios = validar(paso, completo);
    setErrores(propios);
    if (Object.keys(propios).length > 0) return;
    if ((await guardar(completo)) === null) return;
    const i = PASOS.findIndex((p) => p.id === paso);
    if (i < PASOS.length - 1) irA(PASOS[i + 1].id);
  }

  async function publicar() {
    const completo = plegarPendientes();
    if (!completo) return;
    const todos = PASOS.reduce<Errores>((acc, p) => ({ ...acc, ...validar(p.id, completo) }), {});
    if (Object.keys(todos).length > 0) {
      mostrarErrores(todos);
      return;
    }
    const vigente = await guardar(completo);
    if (vigente === null) return;
    await publicarAccion.run(async () => {
      const res = await fetch(`/api/agent-editor/${agente.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_ids: elegidas, lock_version: vigente, notes: notas }),
      });
      const json = (await res.json().catch(() => ({}))) as Respuesta & Partial<EditorPublishOut>;
      if (!res.ok) {
        if (json.fields) mostrarErrores(json.fields);
        // Tope de agentes publicados del plan (HU-BILL-05): no se publicó nada; se explica y se
        // ofrece mejorar el plan junto al botón.
        setLimite(esLimiteDePlan(json.code) ? (json.error ?? "Llegaste al tope de agentes de tu plan.") : null);
        return {
          ok: false,
          status: res.status,
          error: json.fields ? "Revisa los campos marcados antes de publicar." : (json.error ?? "No se pudo publicar."),
        };
      }
      setErrores({});
      setLimite(null);
      setPublicado(json as EditorPublishOut);
      return { ok: true, success: `Versión ${json.version?.version} publicada. Actívala cuando quieras que tus clientes la vean.` };
    });
  }

  async function activar(connectionId: string, releaseId: string, nombre: string) {
    const ok = await confirm({
      title: `Activar en ${nombre}`,
      description:
        "Desde el próximo mensaje, los clientes de esta conexión hablan con esta versión. Puedes volver a la anterior desde Conexiones.",
      confirmLabel: "Activar versión",
    });
    if (!ok) return;
    await activarAccion.run(async () => {
      const res = await fetch("/api/agent-editor/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId, release_id: releaseId }),
      });
      const json = (await res.json().catch(() => ({}))) as Respuesta;
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo activar." };
      setActivadas((a) => new Set([...a, connectionId]));
      return { ok: true, success: `Versión activa en ${nombre}.` };
    });
  }

  const avisosPorPoder = Object.fromEntries(
    Object.entries(avisos).flatMap(([id, aviso]) => {
      const poder = /^poder-(.+)-frase$/.exec(id)?.[1];
      return poder ? [[poder, aviso]] : [];
    }),
  );

  const contenidoDelPaso: Record<PasoId, React.ReactNode> = {
    identidad: (
      <PasoIdentidad
        estado={estado}
        cambiar={cambiar}
        errores={avisos[ID_PROHIBIDAS] ? { ...errores, "persona.forbiddenPhrases": avisos[ID_PROHIBIDAS] } : errores}
        registrarPendiente={pendientes.registrar}
      />
    ),
    modelo: <PasoModelo estado={estado} cambiar={cambiar} errores={errores} catalogo={modelos} />,
    superpoderes: (
      <PasoSuperpoderes
        estado={estado}
        cambiar={cambiar}
        errores={errores}
        erroresPorPoder={{ ...porPoder, ...avisosPorPoder }}
        registrarPendiente={pendientes.registrar}
        catalogo={superpoderes}
        minFrases={minFrases}
        requisitos={requisitos}
      />
    ),
    memoria: <PasoMemoria estado={estado} cambiar={cambiar} errores={errores} agenteId={agente.id} />,
    publicar: (
      <PasoPublicar
        destinos={destinos}
        destinosError={destinosError}
        requisitos={requisitos}
        elegidas={elegidas}
        alternar={(id, activo) => setElegidas((e) => (activo ? [...new Set([...e, id])] : e.filter((x) => x !== id)))}
        errores={errores}
        notas={notas}
        setNotas={setNotas}
      />
    ),
  };

  const steps: StepItem[] = PASOS.map((p, i) => {
    const conError = Object.keys(errores).some((campo) => pasoDelCampo(campo) === p.id);
    const actual = p.id === paso;
    const ultimo = i === PASOS.length - 1;
    return {
      id: p.id,
      title: p.titulo,
      description: p.descripcion,
      state: actual ? "current" : conError ? "error" : visitados.has(p.id) ? "complete" : "upcoming",
      stateLabel: conError ? "Revisar" : visitados.has(p.id) ? "Visto" : undefined,
      content: actual ? (
        <div className="flex flex-col gap-6">
          {contenidoDelPaso[p.id]}
          {ultimo && limite && <AvisoLimiteDePlan mensaje={limite} />}
          <div className="flex flex-wrap gap-3">
            {ultimo ? (
              <Button
                variant="accent"
                onClick={publicar}
                loading={publicarAccion.pending}
                disabled={publicarAccion.pending || guardarAccion.pending || destinos.length === 0}
              >
                Publicar versión
              </Button>
            ) : (
              <Button variant="accent" onClick={siguiente} loading={guardarAccion.pending} disabled={guardarAccion.pending}>
                Guardar y seguir
              </Button>
            )}
            {cambios && (
              <Button
                variant="outline"
                onClick={() => {
                  const completo = plegarPendientes();
                  if (completo) void guardar(completo);
                }}
                disabled={guardarAccion.pending}
              >
                Guardar borrador
              </Button>
            )}
          </div>
        </div>
      ) : undefined,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={steps} onSelect={(id) => irA(id as PasoId)} label="Pasos del editor de agentes" />

      {publicado && (
        <section aria-labelledby="publicado-titulo" className="flex flex-col gap-3 rounded-md border border-border-soft p-5">
          <h2 id="publicado-titulo" className="font-display text-base font-semibold text-headline">
            Versión {publicado.version.version} publicada
          </h2>
          {publicado.warnings.map((aviso) => (
            <p key={aviso} className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
              {aviso}
            </p>
          ))}
          <ul className="flex flex-col gap-3">
            {publicado.connections.map((c) => {
              const destino = destinos.find((d) => d.connection_id === c.connection_id);
              const nombre = destino?.label || destino?.channel || "la conexión";
              const yaActiva = activadas.has(c.connection_id) || destino?.active_release_id === c.release_id;
              return (
                <li key={c.connection_id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-body">
                    <strong className="text-headline">{nombre}:</strong> {textoDeConexionPublicada(c)}
                  </span>
                  {c.release_id && !c.error && puedeActivar && !yaActiva && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activarAccion.pending}
                      onClick={() => activar(c.connection_id, c.release_id as string, nombre)}
                    >
                      Activar en {nombre}
                    </Button>
                  )}
                  {yaActiva && <span className="text-status-success-fg">Activa</span>}
                  {c.release_id && !c.error && !puedeActivar && !yaActiva && (
                    <span className="text-text-soft">La activa el propietario del negocio.</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
