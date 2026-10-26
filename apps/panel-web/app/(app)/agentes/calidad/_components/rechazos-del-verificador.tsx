"use client";

import { useState } from "react";
import Link from "next/link";

import { DetalleDelTurno } from "@/app/(app)/conversaciones/_components/detalle-del-turno";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { VerifierRejection } from "@/lib/api/types";
import { tipoDeRechazo } from "@/lib/calidad";
import { formatDateTime } from "@/lib/format";
import { useAction } from "@/lib/use-action";

/**
 * Los turnos que frenó el verificador (HU-AOS-29). Quien tiene escritura en Agentes marca un rechazo
 * como falso positivo; no se desmarca. Sin permiso de Conversaciones no hay enlace a la conversación
 * ni al depurador del turno (HU-AOS-28), que exige ese mismo permiso.
 */
export function RechazosDelVerificador({
  rechazos,
  puedeMarcar,
  verConversaciones,
}: {
  rechazos: VerifierRejection[];
  puedeMarcar: boolean;
  verConversaciones: boolean;
}) {
  const confirm = useConfirm();
  const { run, pending } = useAction();
  const [turnoAbierto, setTurnoAbierto] = useState<string | null>(null);

  const marcar = async (r: VerifierRejection) => {
    const ok = await confirm({
      title: "¿Marcar como falso positivo?",
      description: `El verificador frenó esta respuesta por «${tipoDeRechazo(r.kind).toLowerCase()}». Si la respuesta era correcta, deja de contar como rechazo. No se puede deshacer.`,
      confirmLabel: "Marcar falso positivo",
    });
    if (!ok) return;
    await run(async () => {
      const res = await fetch(`/api/reliability/verifier/${r.turn_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: r.kind }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return res.ok
        ? { ok: true, success: "Marcado como falso positivo." }
        : { ok: false, status: res.status, error: json.error };
    });
  };

  if (rechazos.length === 0) return null;
  return (
    <>
      <ul className="flex flex-col divide-y divide-border-soft rounded-lg border border-border-soft bg-surface">
        {rechazos.map((r) => (
          <li key={`${r.turn_id}-${r.kind}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="text-headline">{tipoDeRechazo(r.kind)}</span>
            <span className="text-text-soft">{formatDateTime(r.created_at)}</span>
            {verConversaciones && r.conversation_id && (
              <Link href={`/conversaciones?c=${r.conversation_id}`} className="text-link hover:underline">
                Ver conversación
              </Link>
            )}
            {verConversaciones && (
              <button type="button" className="text-link hover:underline" onClick={() => setTurnoAbierto(r.turn_id)}>
                Ver turno
              </button>
            )}
            <span className="ml-auto">
              {r.false_positive ? (
                <Badge variant="neutral">Falso positivo</Badge>
              ) : (
                puedeMarcar && (
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => marcar(r)}>
                    Marcar falso positivo
                  </Button>
                )
              )}
            </span>
          </li>
        ))}
      </ul>
      <DetalleDelTurno turnId={turnoAbierto} onClose={() => setTurnoAbierto(null)} />
    </>
  );
}
