"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EstadoDeError } from "@/components/ui/estado-de-error";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { datosLeidos, motivosEnPalabras, RESULTADO, type Comprobantes } from "@/lib/comprobantes";
import { formatMoney } from "@/lib/format";
import { toast } from "@/lib/toast-store";

type Carga = { estado: "cargando" } | { estado: "error"; detalle: string } | { estado: "ok"; datos: Comprobantes };

/**
 * Bloque «Comprobante» del pedido por transferencia (SPEC-48, HU-COM-22): la foto, lo que leyó la
 * visión, el resultado y, si está en revisión, «Confirmar pago» y «Rechazar» (con motivo). Sin
 * comprobante, «Marcar pagado» para el pago que se verificó por fuera.
 */
export function ComprobanteDelPedido({
  pedidoId,
  moneda,
  puedeEditar,
}: {
  pedidoId: string;
  moneda: string;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [carga, setCarga] = useState<Carga>({ estado: "cargando" });
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idMotivo = useId();
  const ruta = `/api/pack/commerce/orders/${pedidoId}`;

  const leer = useCallback(
    () =>
      fetch(`${ruta}/payment-proofs`, { cache: "no-store" })
        .then(async (res) => {
          const cuerpo = await res.json().catch(() => null);
          setCarga(
            res.ok
              ? { estado: "ok", datos: cuerpo as Comprobantes }
              : { estado: "error", detalle: cuerpo?.error?.message ?? "El servidor no respondió." },
          );
        })
        .catch(() => setCarga({ estado: "error", detalle: "No hay conexión con el servidor." })),
    [ruta],
  );

  useEffect(() => {
    void leer();
  }, [leer]);

  function cargar() {
    setCarga({ estado: "cargando" });
    void leer();
  }

  async function enviar(accion: "confirmar" | "rechazar" | "marcar_pagado", proofId?: string) {
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch(`${ruta}/payment-status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accion, proof_id: proofId ?? null, nota: accion === "rechazar" ? motivo.trim() : "" }),
      });
      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        setError(cuerpo?.error?.message ?? "No pudimos cambiar el pago. Inténtalo de nuevo.");
        return;
      }
      setCarga({ estado: "ok", datos: cuerpo as Comprobantes });
      setRechazando(false);
      setMotivo("");
      toast.success(accion === "rechazar" ? "Comprobante rechazado." : "Pago confirmado.");
      router.refresh();
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (carga.estado === "cargando") {
    return (
      <div aria-busy="true" aria-label="Cargando el comprobante">
        <Skeleton lines={3} />
      </div>
    );
  }
  if (carga.estado === "error") {
    return (
      <EstadoDeError
        forma="en-linea"
        titulo="No pudimos cargar el comprobante"
        descripcion="Revisa tu conexión y vuelve a intentarlo."
        detalle={carga.detalle}
        accion={
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={cargar}>
            Reintentar
          </Button>
        }
      />
    );
  }
  const { datos } = carga;
  const [ultimo] = datos.items;
  const pagado = datos.payment_status === "pagado";

  if (!ultimo) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-soft">
          {pagado ? "El pago se marcó a mano, sin comprobante." : "Aún no llega un comprobante. El agente lo pide cuando el cliente dice que transfirió."}
        </p>
        {puedeEditar && !pagado && (
          <div>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              loading={enviando}
              onClick={async () => {
                const ok = await confirmar({
                  title: "¿Marcar el pedido como pagado?",
                  description: "Úsalo si verificaste la transferencia en tu banco. El agente le podrá decir al cliente que su pago quedó confirmado.",
                  confirmLabel: "Marcar pagado",
                });
                if (ok) void enviar("marcar_pagado");
              }}
            >
              Marcar pagado
            </Button>
          </div>
        )}
        <FormFeedback error={error} />
      </div>
    );
  }

  const resultado = RESULTADO[ultimo.status];
  const motivos = motivosEnPalabras(ultimo.match);
  const leidos = datosLeidos(ultimo.extracted, (n) => formatMoney(n, moneda));
  const enRevision = ultimo.status === "en_revision" && !pagado;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={resultado.tono}>{resultado.label}</Badge>
        {datos.items.length > 1 && <span className="text-sm text-text-soft">{datos.items.length} comprobantes</span>}
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        {ultimo.image_url ? (
          <a href={ultimo.image_url} target="_blank" rel="noreferrer" className="shrink-0 self-start rounded-md focus-visible:outline-2 focus-visible:outline-focus">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de vida corta, fuera del optimizador */}
            <img src={ultimo.image_url} alt="Comprobante que mandó el cliente" className="max-h-56 w-40 rounded-md border border-border-soft object-contain" />
            <span className="sr-only"> (abre la foto en otra pestaña)</span>
          </a>
        ) : (
          <p className="text-sm text-text-soft">La foto ya no está disponible.</p>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          {leidos.length > 0 ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {leidos.map((d) => (
                <div key={d.label} className="contents">
                  <dt className="text-text-soft">{d.label}</dt>
                  <dd className="tabular-nums text-body">{d.valor}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-text-soft">No se leyeron datos del comprobante.</p>
          )}
          {motivos.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-body" aria-label="Por qué no se confirmó solo">
              {motivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {ultimo.review_note && <p className="text-sm text-text-soft">Nota: {ultimo.review_note}</p>}
        </div>
      </div>
      {puedeEditar && enRevision && !rechazando && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-11" loading={enviando} onClick={() => void enviar("confirmar", ultimo.id)}>
            Confirmar pago
          </Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={enviando} onClick={() => setRechazando(true)}>
            Rechazar
          </Button>
        </div>
      )}
      {puedeEditar && enRevision && rechazando && (
        <div className="flex flex-col gap-2">
          <label htmlFor={idMotivo} className="text-sm font-medium text-headline">
            Motivo del rechazo
          </label>
          <Textarea id={idMotivo} value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} placeholder="Por ejemplo: el monto no coincide con el pedido." />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="danger"
              className="min-h-11"
              loading={enviando}
              disabled={!motivo.trim()}
              onClick={() => void enviar("rechazar", ultimo.id)}
            >
              Rechazar comprobante
            </Button>
            <Button type="button" variant="ghost" className="min-h-11" disabled={enviando} onClick={() => setRechazando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      <FormFeedback error={error} />
    </div>
  );
}
