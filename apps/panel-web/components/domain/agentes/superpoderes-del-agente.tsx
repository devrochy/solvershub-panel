"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { PasoSuperpoderes } from "@/app/(app)/agentes/[id]/editar/_components/pasos";
import { Button } from "@/components/ui/button";
import {
  contenidoDesdeEstado,
  erroresDelPaso,
  erroresPorSuperpoder,
  estadoDesdeBorrador,
  type Contenido,
  type Errores,
  type EstadoDelEditor,
} from "@/lib/agentes-editor";
import type { AgentDetail, Requirement, Superpower } from "@/lib/api/types";
import { habilidadLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

type Respuesta = { error?: string; code?: string; fields?: Errores; lockVersion?: number; content?: Contenido };

function activos(estado: EstadoDelEditor): string {
  return JSON.stringify(
    Object.entries(estado.superpoderes)
      .filter(([, p]) => p.activo)
      .map(([id]) => id)
      .sort(),
  );
}

/**
 * Pestaña Superpoderes de la ficha del agente (HU-UX-09): lo que sabe hacer, de qué habilidad
 * viene cada superpoder y un interruptor por cada uno. El interruptor guarda el borrador al
 * momento (con las mismas reglas del editor por pasos); las frases se guardan con su botón.
 * Lo guardado no llega a los clientes hasta publicar: «Publicar cambios» lleva al paso Publicar.
 */
export function SuperpoderesDelAgente({
  agente,
  catalogo,
  minFrases,
  nombreDeHabilidad,
  requisitos = [],
  puedeEditar,
  cambiosSinPublicar,
}: {
  agente: Pick<AgentDetail, "id" | "name" | "description" | "draft">;
  catalogo: Superpower[];
  minFrases: number;
  nombreDeHabilidad: Record<string, string>;
  requisitos?: Requirement[];
  puedeEditar: boolean;
  /** El borrador ya traía cambios sin publicar al abrir la ficha. */
  cambiosSinPublicar: boolean;
}) {
  const guardarAccion = useAction({ refresh: false });
  const [base, setBase] = useState<Contenido>(agente.draft.content);
  const [lock, setLock] = useState(agente.draft.lock_version);
  const [guardado, setGuardado] = useState(() => estadoDesdeBorrador(agente, agente.draft.content, catalogo));
  const [estado, setEstado] = useState<EstadoDelEditor>(guardado);
  const [errores, setErrores] = useState<Errores>({});
  const [sinPublicar, setSinPublicar] = useState(cambiosSinPublicar);

  const contenido = useMemo(() => contenidoDesdeEstado(base, estado, catalogo), [base, estado, catalogo]);
  const porPoder = useMemo(() => erroresPorSuperpoder(errores, contenido), [errores, contenido]);
  const pendiente = JSON.stringify(estado) !== JSON.stringify(guardado);

  async function guardar(nuevo: EstadoDelEditor) {
    const propios = erroresDelPaso("superpoderes", nuevo, catalogo, { minFrases });
    setErrores(propios);
    if (Object.keys(propios).length > 0) return;
    await guardarAccion.run(async () => {
      const res = await fetch(`/api/agent-editor/${agente.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contenidoDesdeEstado(base, nuevo, catalogo), lock_version: lock }),
      });
      const json = (await res.json().catch(() => ({}))) as Respuesta;
      if (!res.ok) {
        if (json.fields) setErrores(json.fields);
        const error =
          json.code === "stale_lock_version"
            ? "Otra persona guardó este agente mientras lo editabas. Recarga la página para ver sus cambios."
            : (json.error ?? "No se pudo guardar el borrador.");
        return { ok: false, status: res.status, error };
      }
      setLock(json.lockVersion ?? lock);
      if (json.content) setBase(json.content);
      setGuardado(nuevo);
      setSinPublicar(true);
      return { ok: true, success: "Guardado en el borrador. Publica para que tus clientes lo vean." };
    });
  }

  function cambiar(cambio: Partial<EstadoDelEditor>) {
    const nuevo = { ...estado, ...cambio };
    setEstado(nuevo);
    // El interruptor guarda al momento; escribir frases no (se guardan con su botón).
    if (activos(nuevo) !== activos(estado)) void guardar(nuevo);
  }

  return (
    <section aria-labelledby="superpoderes-agente-titulo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="superpoderes-agente-titulo" className="font-display text-sh-block text-headline">
          Qué sabe hacer {agente.name}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {puedeEditar && pendiente && (
            <Button variant="outline" onClick={() => void guardar(estado)} loading={guardarAccion.pending} disabled={guardarAccion.pending}>
              Guardar frases
            </Button>
          )}
          {puedeEditar && sinPublicar && !pendiente && (
            <Button asChild variant="accent">
              <Link href={`/agentes/${agente.id}/editar?paso=publicar`}>Publicar cambios</Link>
            </Button>
          )}
        </div>
      </div>
      {puedeEditar && sinPublicar && !pendiente && (
        <p role="status" className="text-sm text-body">
          Tienes cambios guardados en el borrador que tus clientes todavía no ven.
        </p>
      )}
      {!puedeEditar && (
        <p className="text-sm text-text-soft">Solo quien puede editar agentes cambia sus superpoderes.</p>
      )}
      <PasoSuperpoderes
        estado={estado}
        cambiar={cambiar}
        errores={errores}
        erroresPorPoder={porPoder}
        catalogo={catalogo}
        minFrases={minFrases}
        requisitos={requisitos}
        nombreDeHabilidad={(skill) => nombreDeHabilidad[skill] ?? habilidadLabel(skill)}
        interruptor
        soloLectura={!puedeEditar}
      />
    </section>
  );
}
