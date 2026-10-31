"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TONO_DE_ETAPA } from "@/lib/clientes";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/use-action";

/**
 * Etapa de un lead con menú para cambiarla desde la lista (HU-CRM-19). El cambio se ve al instante y
 * vuelve a la etapa anterior si el servidor lo rechaza (el toast trae su motivo). Escribe con el mismo
 * `PATCH` del pack que usa la ficha (ADR-0149), así que la lista y la ficha muestran lo mismo y el
 * cambio queda en la historia del cliente (HU-CRM-18).
 *
 * El pasar a «perdido» no pide motivo todavía: eso llega con HU-CRM-23.
 */
export function EtapaMenu({
  leadId,
  nombre,
  pluginId,
  clave,
  actual,
  texto,
  opciones,
  grande = false,
}: {
  leadId: string;
  /** Nombre visible del cliente, para el aviso y las etiquetas accesibles. */
  nombre: string;
  pluginId: string;
  /** Clave del campo editable de la etapa (`estado_lead`). */
  clave: string;
  /** Código de la etapa que trae la fila; "" si el nombre no está entre las opciones. */
  actual: string;
  /** Nombre de la etapa tal como lo trae la fila. */
  texto: string;
  opciones: { value: string; label: string }[];
  /** Destino táctil de 44 px (tarjetas móviles). */
  grande?: boolean;
}) {
  const [codigo, setCodigo] = useState(actual);
  const [delServidor, setDelServidor] = useState(actual);
  // Cuando la vista del servidor se refresca, manda lo que dice el servidor.
  if (delServidor !== actual) {
    setDelServidor(actual);
    setCodigo(actual);
  }
  const anterior = useRef(actual);
  const accion = useAction({ rollback: () => setCodigo(anterior.current) });

  const elegida = opciones.find((o) => o.value === codigo);
  const etiqueta = elegida?.label ?? texto;

  async function cambiar(valor: string) {
    if (valor === codigo || accion.pending) return;
    const nueva = opciones.find((o) => o.value === valor);
    anterior.current = codigo;
    setCodigo(valor);
    await accion.run(async () => {
      const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/pack/${encodeURIComponent(pluginId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores: { [clave]: valor } }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      return {
        ok: res.ok,
        status: res.status,
        error: typeof json.error === "string" ? json.error : undefined,
        success: `${nombre} pasó a ${nueva?.label ?? valor}.`,
      };
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={accion.pending}
          aria-label={`Etapa: ${etiqueta}. Cambiar la etapa de ${nombre}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1 text-left outline-none transition-colors",
            "hover:bg-hover focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60",
            grande ? "min-h-11" : "min-h-9",
          )}
        >
          <Badge variant={TONO_DE_ETAPA[codigo] ?? "neutral"}>{etiqueta}</Badge>
          <ChevronDown className="h-4 w-4 text-text-soft" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {opciones.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={() => void cambiar(o.value)}
            icon={o.value === codigo ? <Check aria-hidden /> : <span className="inline-block h-4 w-4" aria-hidden />}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
