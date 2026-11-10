"use client";

import Link from "next/link";
import { useState } from "react";

import { Power, Star, UserMinus } from "lucide-react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { type Column } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { InputNumero } from "@/components/ui/input-numero";
import { Select } from "@/components/ui/select";
import { mensajeErrorAgentes, rolLegible } from "@/lib/conexion-ficha";
import { useAction } from "@/lib/use-action";

export type FilaAgente = {
  instanceId: string;
  agentId: string;
  name: string;
  role: "core" | "specialist" | "backoffice";
  priority: number;
  isDefault: boolean;
  enabled: boolean;
  /** «v3», «v4 en la próxima versión»… (`versionDeAgente`). */
  version: string;
};

export type AgenteAsignable = { id: string; name: string };

async function llamar(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.ok) return { ok: true as const, status: res.status };
  const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  return { ok: false as const, status: res.status, error: mensajeErrorAgentes(json.code, json.error ?? "No se pudo guardar.") };
}

/**
 * Pestaña Agentes de la ficha (HU-UX-09): quién atiende en esta conexión, con su rol, prioridad,
 * cuál es el principal, versión y estado; cada agente lleva a su ficha. Las acciones siguen las
 * reglas de `connection_agents.py`: el Coordinador no se toca y siempre hay un principal habilitado.
 */
export function AgentesDeConexion({
  conexionId,
  filas,
  asignables,
  puedeEditar,
  tieneCoordinador,
}: {
  conexionId: string;
  filas: FilaAgente[];
  asignables: AgenteAsignable[];
  puedeEditar: boolean;
  tieneCoordinador: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const base = `/api/connections/${conexionId}/agents`;

  const cambiar = (f: FilaAgente, cambio: Record<string, unknown>, exito: string) =>
    run(async () => {
      const r = await llamar(`${base}/${f.instanceId}`, "PATCH", cambio);
      return r.ok ? { ok: true, success: exito } : r;
    });

  async function quitar(f: FilaAgente) {
    const ok = await confirm({
      title: "Quitar agente",
      description: `«${f.name}» deja de atender en esta conexión con la próxima versión.`,
      confirmLabel: "Quitar",
    });
    if (!ok) return;
    await run(async () => {
      const r = await llamar(`${base}/${f.instanceId}`, "DELETE");
      return r.ok ? { ok: true, success: "Agente quitado." } : r;
    });
  }

  const estado = (f: FilaAgente) =>
    !f.enabled ? (
      <Badge variant="neutral">Deshabilitado</Badge>
    ) : f.isDefault ? (
      <Badge variant="accent">Principal</Badge>
    ) : (
      <Badge variant="success">Atiende</Badge>
    );

  const menu = (f: FilaAgente) =>
    !puedeEditar || f.role === "core" || f.isDefault ? null : (
      <MenuDeFila etiqueta={`Más acciones de ${f.name}`}>
        {f.enabled && (
          <DropdownMenuItem icon={<Star />} disabled={pending} onSelect={() => void cambiar(f, { is_default: true }, "Agente principal cambiado.")}>
            Hacerlo el principal
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          icon={<Power />}
          disabled={pending}
          onSelect={() => void cambiar(f, { enabled: !f.enabled }, f.enabled ? "Agente deshabilitado." : "Agente habilitado.")}
        >
          {f.enabled ? "Deshabilitar" : "Habilitar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={<UserMinus />} tone="danger" disabled={pending} onSelect={() => void quitar(f)}>
          Quitar de la conexión
        </DropdownMenuItem>
      </MenuDeFila>
    );

  const columnas: Column<FilaAgente>[] = [
    {
      key: "agente",
      header: "Agente",
      cell: (f) => (
        <div className="flex flex-col">
          <Link href={`/agentes/${f.agentId}`} className="font-medium text-link underline-offset-2 hover:underline">
            {f.name}
          </Link>
          <span className="text-xs text-text-soft">{rolLegible(f.role)}</span>
        </div>
      ),
    },
    { key: "estado", header: "Estado", info: "El principal atiende cuando ningún especialista aplica.", cell: estado },
    {
      key: "prioridad",
      header: "Prioridad",
      align: "right",
      className: "max-lg:hidden",
      info: "Con varios especialistas, el de menor número se prueba primero.",
      cell: (f) => <span className="tabular-nums text-body">{f.priority}</span>,
    },
    { key: "version", header: "Versión", className: "max-lg:hidden", cell: (f) => <span className="text-body">{f.version}</span> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-10",
      cell: (f) => menu(f) ?? (f.role === "core" && puedeEditar ? <span className="sr-only">Lo gestiona el sistema</span> : null),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {puedeEditar && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-body">Los cambios aplican con la próxima versión de la conexión.</p>
          <AsignarAgente base={base} asignables={asignables} deshabilitado={!tieneCoordinador} />
        </div>
      )}
      <TablaResponsiva
        etiqueta="Agentes de la conexión"
        caption="Agentes de la conexión"
        columns={columnas}
        rows={filas}
        getRowKey={(f) => f.instanceId}
        emptyTitle="Sin agentes en esta conexión"
        emptyDescription="Asigna un agente publicado para que atienda por aquí."
        filaCelular={(f) => ({
          titulo: f.name,
          detalle: `${rolLegible(f.role)} · ${!f.enabled ? "Deshabilitado" : f.isDefault ? "Principal" : "Atiende"} · ${f.version}`,
          href: `/agentes/${f.agentId}`,
          accion: menu(f),
        })}
      />
    </div>
  );
}

function AsignarAgente({
  base,
  asignables,
  deshabilitado,
}: {
  base: string;
  asignables: AgenteAsignable[];
  deshabilitado: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [agente, setAgente] = useState("");
  const [prioridad, setPrioridad] = useState(100);
  const { run, pending } = useAction();

  async function asignar() {
    const ok = await run(async () => {
      const r = await llamar(base, "POST", { agent_id: agente, priority: prioridad });
      return r.ok ? { ok: true, success: "Agente asignado." } : r;
    });
    if (ok) {
      setAbierto(false);
      setAgente("");
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="accent" disabled={deshabilitado || asignables.length === 0}>
          Asignar agente
        </Button>
      </DialogTrigger>
      <DialogContent title="Asignar agente" description="Elige un especialista publicado para que atienda en esta conexión.">
        <div className="flex flex-col gap-4">
          <Field label="Agente" htmlFor="asignar-agente">
            <Select id="asignar-agente" value={agente} onChange={(e) => setAgente(e.target.value)}>
              <option value="">Elige un agente…</option>
              {asignables.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad" htmlFor="asignar-prioridad" help="De 0 a 1000; el de menor número se prueba primero.">
            <InputNumero id="asignar-prioridad" min={0} max={1000} value={prioridad} onValueChange={setPrioridad} className="w-32" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button variant="accent" loading={pending} disabled={!agente || pending} onClick={() => void asignar()}>
              Asignar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
