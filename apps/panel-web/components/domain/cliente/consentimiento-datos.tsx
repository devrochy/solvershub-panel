"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  ESTADO_AVISO,
  mensajeDeErrorAlRetirar,
  mostrarEnFicha,
  ORIGEN_AVISO,
  puedeRetirarDatos,
  type ConsentimientoDatos,
} from "@/lib/aviso-datos";
import { formatDateTime } from "@/lib/format";
import { useAction } from "@/lib/use-action";

/**
 * Tratamiento de datos del cliente (HU-CRM-16): si ya se le mostró el aviso y qué respondió, con quién y
 * cuándo. Solo aparece cuando el negocio tiene el aviso activo o el cliente ya tiene historia. El dueño
 * puede retirar los datos del cliente: se anota que no autoriza guardarlos y se borran de su perfil; los
 * pedidos, citas y demás registros de los módulos no se tocan desde aquí.
 */
export function ConsentimientoDatosDelCliente({ leadId }: { leadId: string }) {
  const [datos, setDatos] = useState<ConsentimientoDatos | null>(null);
  const [retirados, setRetirados] = useState<string[] | null>(null);
  const confirm = useConfirm();
  const accion = useAction({ refresh: false });

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}/consentimiento-datos`);
    if (res.ok) setDatos((await res.json()) as ConsentimientoDatos);
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await
    void cargar();
  }, [cargar]);

  async function retirar() {
    const ok = await confirm({
      title: "¿Retirar los datos de este cliente?",
      description:
        "Se borran los datos personales que el asistente guardó en su perfil y queda anotado que no autoriza guardarlos. Sus pedidos, citas y demás registros se conservan.",
      confirmLabel: "Retirar datos",
      destructive: true,
    });
    if (!ok) return;
    const hecho = await accion.run(async () => {
      const res = await fetch(`/api/leads/${leadId}/consentimiento-datos/revocar`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string; datos_retirados?: string[] };
      if (res.ok) setRetirados(json.datos_retirados ?? []);
      return {
        ok: res.ok,
        status: res.status,
        error: mensajeDeErrorAlRetirar(res.status, json.error),
        success: "Datos retirados.",
      };
    });
    if (hecho) await cargar();
  }

  if (!mostrarEnFicha(datos) || !datos) return null;
  const estado = ESTADO_AVISO[datos.estado];
  const ultimo = datos.historial[0];

  return (
    <section aria-labelledby="ficha-consentimiento-datos" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="ficha-consentimiento-datos" className="text-sm font-semibold text-headline">
          Tratamiento de datos
        </h3>
        <Badge variant={estado.tono}>{estado.etiqueta}</Badge>
      </div>
      {ultimo && (
        <p className="text-xs text-text-soft">
          {ORIGEN_AVISO[ultimo.origen] ?? ultimo.origen}, por {ultimo.quien}, {formatDateTime(ultimo.created_at)}
          {ultimo.evidencia ? ` · ${ultimo.evidencia}` : ""}
        </p>
      )}
      {retirados && (
        <p role="status" className="text-xs text-text-soft">
          {retirados.length > 0
            ? `Se retiraron ${retirados.length} dato(s) del perfil. Los registros de pedidos, citas y otros módulos se conservan.`
            : "No había datos del perfil por retirar. Los registros de los módulos se conservan."}
        </p>
      )}
      {puedeRetirarDatos(datos) && (
        <Button size="sm" variant="outline" onClick={() => void retirar()} disabled={accion.pending}>
          Retirar sus datos
        </Button>
      )}
    </section>
  );
}
