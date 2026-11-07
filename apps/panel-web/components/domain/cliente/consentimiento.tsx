"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Consentimiento } from "@/lib/api/types";
import { AVISO_BAJA_DEL_CLIENTE, AVISO_SOLO_PROPIETARIO, esBajaDelCliente, mensajeDeErrorAlGuardarConsentimiento } from "@/lib/consentimiento-promos";
import { formatDateTime } from "@/lib/format";
import { useAction } from "@/lib/use-action";

const ESTADO: Record<string, { label: string; tone: "success" | "danger" | "neutral" }> = {
  otorgado: { label: "Acepta promociones", tone: "success" },
  revocado: { label: "Se dio de baja", tone: "danger" },
  sin_registro: { label: "Sin consentimiento", tone: "neutral" },
};

const ORIGEN: Record<string, string> = {
  ficha: "marcado en la ficha",
  palabra_de_baja: "lo pidió por WhatsApp",
  meta_131050: "WhatsApp dejó de entregarle promociones",
};

/**
 * Consentimiento del cliente para recibir promociones (HU-CRM-06, D-SPEC-33-5). Solo quien aceptó
 * recibe un envío a un segmento. Se marca con cómo se obtuvo y queda quién lo marcó; nunca se
 * edita lo anterior, se agrega.
 *
 * D-SPEC-33-9: registrar que aceptó es solo del propietario (o la plataforma) y nunca sobre una baja que
 * pidió el cliente o impuso Meta; registrar que ya no acepta sigue abierto a quien tiene Clientes en
 * escritura. El servidor lo exige igual (403 / 409 `baja_del_cliente`); aquí no se ofrece lo que no se puede.
 */
export function ConsentimientoDelCliente({
  leadId,
  esPropietario = false,
}: {
  leadId: string;
  /** Propietario o admin de plataforma. Sin esto no se ofrece «Aceptó recibir promociones». */
  esPropietario?: boolean;
}) {
  const [datos, setDatos] = useState<Consentimiento | null>(null);
  const [marcando, setMarcando] = useState(false);
  const [como, setComo] = useState("en_el_local");
  const [evidencia, setEvidencia] = useState("");
  const accion = useAction({ refresh: false });

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/leads/${leadId}/consentimiento`);
    if (res.ok) setDatos((await res.json()) as Consentimiento);
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await
    void cargar();
  }, [cargar]);

  async function guardar(estado: "otorgado" | "revocado") {
    const ok = await accion.run(async () => {
      const res = await fetch(`/api/leads/${leadId}/consentimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, como: estado === "revocado" ? "otro" : como, evidencia }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      return {
        ok: res.ok,
        status: res.status,
        error: mensajeDeErrorAlGuardarConsentimiento(res.status, json.error, json.code),
        success: estado === "otorgado" ? "Consentimiento guardado." : "Quedó dado de baja.",
      };
    });
    if (ok) {
      setMarcando(false);
      setEvidencia("");
      await cargar();
    } else if (estado === "otorgado") {
      // Pudo llegar una baja del cliente mientras estaba el formulario abierto: se vuelve a leer el estado.
      await cargar();
    }
  }

  const estado = ESTADO[datos?.estado ?? "sin_registro"] ?? ESTADO.sin_registro;
  const ultimo = datos?.historial[0];
  const bajaDelCliente = esBajaDelCliente(datos);
  const puedeMarcarQueAcepto = esPropietario && !bajaDelCliente;

  return (
    <section aria-labelledby="ficha-consentimiento" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="ficha-consentimiento" className="text-sm font-semibold text-headline">
          Promociones
        </h3>
        <Badge variant={estado.tone}>{estado.label}</Badge>
      </div>
      {ultimo && (
        <p className="text-xs text-text-soft">
          {ORIGEN[ultimo.origen] ?? ultimo.origen} por {ultimo.quien}, {formatDateTime(ultimo.created_at)}
          {ultimo.evidencia ? ` · ${ultimo.evidencia}` : ""}
        </p>
      )}
      {bajaDelCliente && <p className="text-xs text-text-soft">{AVISO_BAJA_DEL_CLIENTE}</p>}
      {!bajaDelCliente && !esPropietario && datos && datos.estado !== "otorgado" && (
        <p className="text-xs text-text-soft">{AVISO_SOLO_PROPIETARIO}</p>
      )}
      {!marcando && (
        <div className="flex flex-wrap gap-2">
          {datos && datos.estado !== "otorgado" && puedeMarcarQueAcepto && (
            <Button size="sm" variant="outline" onClick={() => setMarcando(true)}>
              Aceptó recibir promociones
            </Button>
          )}
          {datos?.estado === "otorgado" && (
            <Button size="sm" variant="outline" onClick={() => void guardar("revocado")} disabled={accion.pending}>
              Ya no quiere promociones
            </Button>
          )}
        </div>
      )}
      {marcando && puedeMarcarQueAcepto && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <p className="text-xs text-text-soft">
            Márcalo solo si el cliente aceptó. Queda registrado con tu nombre y cómo lo obtuviste.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cómo lo obtuviste" htmlFor="cons-como">
              <Select id="cons-como" value={como} onChange={(e) => setComo(e.target.value)}>
                <option value="en_el_local">En el local</option>
                <option value="por_telefono">Por teléfono</option>
                <option value="por_escrito">Por escrito</option>
                <option value="otro">Otro</option>
              </Select>
            </Field>
            <Field label={como === "otro" ? "Cuéntalo" : "Detalle (opcional)"} htmlFor="cons-evidencia">
              <Input
                id="cons-evidencia"
                value={evidencia}
                maxLength={400}
                onChange={(e) => setEvidencia(e.target.value)}
                placeholder="Ej.: firmó la planilla del local"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setMarcando(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="accent"
              onClick={() => void guardar("otorgado")}
              disabled={accion.pending || (como === "otro" && !evidencia.trim())}
            >
              Guardar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
