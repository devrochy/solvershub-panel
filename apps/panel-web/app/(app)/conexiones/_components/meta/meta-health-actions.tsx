"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

/** Estado manual del método de pago en Meta: Meta no lo informa por API. */
const PAGO: { valor: string; etiqueta: string }[] = [
  { valor: "", etiqueta: "Sin confirmar" },
  { valor: "ok", etiqueta: "Ya está agregado" },
  { valor: "pending", etiqueta: "En trámite" },
  { valor: "failed", etiqueta: "Meta lo rechazó" },
];

type TokenInspect = {
  is_valid: boolean;
  never_expires: boolean;
  token_expires_at: string | null;
  has_whatsapp_scopes: boolean;
};

type TokenExtend = {
  token_expires_at: string | null;
};

function describirPermiso(info: TokenInspect): string {
  const estado = info.is_valid ? "El permiso de acceso funciona" : "El permiso de acceso no funciona";
  const vence = info.never_expires
    ? "no vence"
    : info.token_expires_at
      ? `vence el ${formatDateTime(info.token_expires_at)}`
      : "no tiene fecha de vencimiento";
  const permisos = info.has_whatsapp_scopes ? "incluye WhatsApp" : "no incluye WhatsApp";
  return `${estado}, ${vence} y ${permisos}.`;
}

function useAccionDeMeta(connectionId: string) {
  const router = useRouter();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function enviar<T>(body: Record<string, unknown>): Promise<(T & { error?: string }) | null> {
    setStatus({ loading: true });
    const res = await fetch(`/api/meta/health/${connectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo completar la acción." });
      return null;
    }
    return json;
  }

  return { status, setStatus, enviar, refrescar: () => router.refresh() };
}

/** Vuelve a revisar la cuenta con Meta: la acción principal de Salud. */
export function RevisarAhora({ connectionId }: { connectionId: string }) {
  const { status, setStatus, enviar, refrescar } = useAccionDeMeta(connectionId);
  async function revisar() {
    if (await enviar({ action: "diagnose" })) {
      setStatus({ success: "Revisión lista." });
      refrescar();
    }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={() => void revisar()} loading={status.loading}>
        Revisar ahora
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}

/** Renovar el permiso de acceso a Meta (el token) o ver hasta cuándo sirve. */
export function PermisoDeAcceso({ connectionId }: { connectionId: string }) {
  const { status, setStatus, enviar, refrescar } = useAccionDeMeta(connectionId);
  async function renovar() {
    const json = await enviar<TokenExtend>({ action: "extend_token" });
    if (!json) return;
    setStatus({ success: `Permiso renovado: ahora vence el ${json.token_expires_at ? formatDateTime(json.token_expires_at) : "—"}.` });
    refrescar();
  }
  async function consultar() {
    const json = await enviar<TokenInspect>({ action: "inspect_token" });
    if (json) setStatus({ success: describirPermiso(json) });
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => void consultar()} disabled={status.loading}>
          Consultar
        </Button>
        <Button variant="outline" size="sm" onClick={() => void renovar()} disabled={status.loading}>
          Renovar
        </Button>
      </div>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}

/** El método de pago en Meta se marca a mano: Meta no lo informa. */
export function MetodoDePago({ connectionId, billingStatus }: { connectionId: string; billingStatus: string }) {
  const { status, setStatus, enviar, refrescar } = useAccionDeMeta(connectionId);
  const [valor, setValor] = useState(billingStatus);
  async function guardar(siguiente: string) {
    setValor(siguiente);
    if (await enviar({ action: "billing", manual_status: siguiente })) {
      setStatus({ success: "Guardado." });
      refrescar();
    }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Select
        aria-label="Método de pago en Meta"
        value={valor}
        onChange={(e) => void guardar(e.target.value)}
        disabled={status.loading}
        className="w-52"
      >
        {PAGO.map((p) => (
          <option key={p.valor || "sin"} value={p.valor}>
            {p.etiqueta}
          </option>
        ))}
      </Select>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}

/** Volver a conectar la cuenta para que Meta le envíe los mensajes (antes «Re-suscribir WABA»). */
export function VolverAConectar({ connectionId }: { connectionId: string }) {
  const { status, setStatus, enviar, refrescar } = useAccionDeMeta(connectionId);
  async function volver() {
    if (await enviar({ action: "resubscribe" })) {
      setStatus({ success: "Listo. Revisa de nuevo para confirmarlo." });
      refrescar();
    }
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="ghost" size="sm" onClick={() => void volver()} disabled={status.loading}>
        Volver a conectar
      </Button>
      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}
