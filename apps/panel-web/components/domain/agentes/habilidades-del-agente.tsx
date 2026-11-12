"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AgentSkill, PaymentAccount } from "@/lib/api/types";
import {
  PAGOS,
  cuentaElegida,
  estadoDeHabilidad,
  etiquetaDeCuenta,
  textoDeHabilidad,
} from "@/lib/habilidades-del-agente";
import { toast } from "@/lib/toast-store";

const ESTADO: Record<ReturnType<typeof estadoDeHabilidad>, { texto: string; tono: "neutral" | "success" | "warning" }> = {
  sin_agregar: { texto: "Sin agregar", tono: "neutral" },
  lista: { texto: "Lista", tono: "success" },
  falta_configurar: { texto: "Falta configurar", tono: "warning" },
};

/**
 * Habilidades que se agregan a uno o varios agentes (ADR-0190, HU-AOS-66): Pagos en línea y Conocimiento. Cada cambio
 * se guarda en el acto en el agente (no pasa por el borrador). Pagos pide elegir una cuenta Wompi del negocio; las
 * cuentas se administran en Conexiones › Pagos. Captar leads se enciende en «Acciones».
 */
export function HabilidadesDelAgente({
  agenteId,
  inicial,
  cuentas,
  puedeEditar,
}: {
  agenteId: string;
  inicial: AgentSkill[];
  cuentas: PaymentAccount[];
  puedeEditar: boolean;
}) {
  const [habilidades, setHabilidades] = useState(inicial);
  const [guardando, setGuardando] = useState<string | null>(null);

  async function guardar(packId: string, installed: boolean, config?: Record<string, unknown>) {
    setGuardando(packId);
    try {
      const res = await fetch(`/api/agent-editor/${agenteId}/skills/${packId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installed, ...(config ? { config } : {}) }),
      });
      const data = (await res.json().catch(() => null)) as AgentSkill | { error?: string } | null;
      if (!res.ok || !data || "error" in data) {
        toast.error((data && "error" in data && data.error) || "No se pudo guardar la habilidad.");
        return;
      }
      setHabilidades((todas) => todas.map((h) => (h.pack_id === packId ? (data as AgentSkill) : h)));
      toast.success(installed ? "Habilidad guardada." : "Habilidad quitada.");
    } finally {
      setGuardando(null);
    }
  }

  if (habilidades.length === 0) {
    return <p className="text-sm text-text-soft">No hay habilidades para agregar a este agente.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {habilidades.map((h) => {
        const { nombre, descripcion } = textoDeHabilidad(h.pack_id);
        const estado = ESTADO[estadoDeHabilidad(h)];
        const elegida = cuentaElegida(h, cuentas);
        const ocupado = guardando === h.pack_id;
        const idSwitch = `habilidad-${h.pack_id}`;
        return (
          <li key={h.pack_id} className="flex flex-col gap-3 rounded-md border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={idSwitch} className="font-medium text-headline">
                  {nombre}
                </label>
                <p className="text-sm text-text-soft">{descripcion}</p>
              </div>
              <div className="flex items-center gap-3">
                {estado.tono === "neutral" ? (
                  <Badge>{estado.texto}</Badge>
                ) : (
                  <Badge variant={estado.tono}>{estado.texto}</Badge>
                )}
                <Switch
                  id={idSwitch}
                  checked={h.installed}
                  disabled={!puedeEditar || ocupado}
                  onCheckedChange={(valor) => guardar(h.pack_id, valor)}
                />
              </div>
            </div>
            {h.pack_id === PAGOS && h.installed && (
              <div className="flex flex-col gap-2">
                <label htmlFor="cuenta-wompi" className="text-sm font-medium text-headline">
                  Cuenta Wompi con la que cobra
                </label>
                {cuentas.length === 0 ? (
                  <p className="text-sm text-text-soft">
                    Todavía no tienes cuentas.{" "}
                    <Link className="underline" href="/conexiones/pagos">
                      Agrega una en Conexiones › Pagos
                    </Link>
                    .
                  </p>
                ) : (
                  <Select
                    id="cuenta-wompi"
                    value={elegida?.id ?? ""}
                    disabled={!puedeEditar || ocupado}
                    onChange={(e) => e.target.value && guardar(PAGOS, true, { cuenta_id: e.target.value })}
                  >
                    <option value="">Elige una cuenta</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {etiquetaDeCuenta(c)}
                      </option>
                    ))}
                  </Select>
                )}
                {cuentas.length > 0 && (
                  <Link className="text-sm underline" href="/conexiones/pagos">
                    Agregar o editar cuentas
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
