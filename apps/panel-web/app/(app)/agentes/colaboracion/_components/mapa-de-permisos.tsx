"use client";

import "@xyflow/react/dist/style.css";

import { Background, Controls, MarkerType, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { useMemo } from "react";

import { MODOS, type AgenteMin, type Permiso } from "@/lib/colaboracion";

const ETIQUETA_CORTA: Record<string, string> = { handoff: "pasa", delegate: "encarga", query: "consulta" };

/**
 * Mapa de solo lectura de los permisos (HU-AOS-26). No reemplaza a la lista, que es la vista
 * accesible y la única donde se edita: el mapa se describe en texto para el lector de pantalla.
 */
export function MapaDePermisos({ agentes, permisos }: { agentes: AgenteMin[]; permisos: Permiso[] }) {
  const { nodes, edges, resumen } = useMemo(() => {
    const radio = Math.max(140, agentes.length * 45);
    const nodes: Node[] = agentes.map((a, i) => {
      const angulo = (2 * Math.PI * i) / agentes.length - Math.PI / 2;
      return {
        id: a.id,
        position: { x: radio + radio * Math.cos(angulo), y: radio + radio * Math.sin(angulo) },
        data: { label: a.name },
        className: "!rounded-md !border !border-border-soft !bg-surface !text-headline !text-sm",
      };
    });
    const nombre = Object.fromEntries(agentes.map((a) => [a.id, a.name]));
    const visibles = permisos.filter((p) => p.modes.length > 0 && nombre[p.from_agent_id] && nombre[p.to_agent_id]);
    // Un par con permisos en los dos sentidos va en una sola arista (dos aristas opuestas se
    // superponen): flechas en ambos extremos y una etiqueta por agente.
    const corto = (p: Permiso) => p.modes.map((m) => ETIQUETA_CORTA[m] ?? m).join(" · ");
    const porPar = new Map<string, Permiso[]>();
    for (const p of visibles) {
      const clave = [p.from_agent_id, p.to_agent_id].sort().join("|");
      porPar.set(clave, [...(porPar.get(clave) ?? []), p]);
    }
    const edges: Edge[] = [...porPar.values()].map(([ida, vuelta]) => ({
      id: `${ida.from_agent_id}>${ida.to_agent_id}`,
      source: ida.from_agent_id,
      target: ida.to_agent_id,
      label: vuelta
        ? `${nombre[ida.from_agent_id]}: ${corto(ida)} / ${nombre[vuelta.from_agent_id]}: ${corto(vuelta)}`
        : corto(ida),
      markerEnd: { type: MarkerType.ArrowClosed },
      ...(vuelta ? { markerStart: { type: MarkerType.ArrowClosed } } : {}),
      animated: ida.modes.includes("handoff") || Boolean(vuelta?.modes.includes("handoff")),
    }));
    const etiqueta = Object.fromEntries(MODOS.map((m) => [m.modo, m.etiqueta.toLowerCase()]));
    const resumen = visibles.length
      ? visibles
          .map((p) => `${nombre[p.from_agent_id]} → ${nombre[p.to_agent_id]}: ${p.modes.map((m) => etiqueta[m]).join(", ")}`)
          .join(". ")
      : "Todavía no hay permisos entre agentes.";
    return { nodes, edges, resumen };
  }, [agentes, permisos]);

  return (
    <figure className="flex flex-col gap-2">
      <div className="h-[420px] rounded-lg border border-border-soft bg-bg-deep" role="img" aria-label={`Mapa de permisos. ${resumen}`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <figcaption className="text-sm text-soft">
        Solo para ver: los permisos se cambian en la lista. Las flechas animadas son para pasar la conversación.
      </figcaption>
    </figure>
  );
}
