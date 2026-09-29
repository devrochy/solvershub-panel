"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

const BILLING_STATES = ["", "ok", "pending", "failed"];

type TokenInspect = {
  is_valid: boolean;
  never_expires: boolean;
  token_expires_at: string | null;
  has_whatsapp_scopes: boolean;
};

type TokenExtend = {
  token_expires_at: string | null;
};

function describeToken(info: TokenInspect): string {
  const estado = info.is_valid ? "válido" : "inválido";
  const vence = info.never_expires
    ? "no expira"
    : info.token_expires_at
      ? `vence el ${formatDateTime(info.token_expires_at)}`
      : "sin fecha de vencimiento";
  const permisos = info.has_whatsapp_scopes ? "con permisos de WhatsApp" : "sin permisos de WhatsApp";
  return `Token ${estado} · ${vence} · ${permisos}.`;
}

/** Reparaciones de una conexión Meta y acciones sobre su token BYOK. */
export function MetaHealthActions({
  connectionId,
  billingStatus,
}: {
  connectionId: string;
  billingStatus: string;
}) {
  const router = useRouter();
  const [billing, setBilling] = useState(billingStatus);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function run(action: "diagnose" | "resubscribe" | "billing", manual?: string) {
    setStatus({ loading: true });
    const res = await fetch(`/api/meta/health/${connectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, manual_status: manual }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo completar la acción." });
      return;
    }
    setStatus({ success: "Listo." });
    router.refresh();
  }

  async function runToken(action: "inspect_token" | "extend_token") {
    setStatus({ loading: true });
    const res = await fetch(`/api/meta/health/${connectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json().catch(() => ({}))) as TokenInspect & TokenExtend & { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo completar la acción sobre el token." });
      return;
    }
    if (action === "inspect_token") {
      setStatus({ success: describeToken(json) });
      return;
    }
    const vence = json.token_expires_at ? formatDateTime(json.token_expires_at) : "sin fecha";
    setStatus({ success: `Token extendido ✅ · nueva caducidad: ${vence}` });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void run("diagnose")}
          disabled={status.loading}
        >
          Diagnosticar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void run("resubscribe")}
          disabled={status.loading}
        >
          Re-suscribir WABA
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="accent"
          size="sm"
          onClick={() => void runToken("extend_token")}
          disabled={status.loading}
        >
          Extender a 60 días
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void runToken("inspect_token")}
          disabled={status.loading}
        >
          Ver estado del token
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          aria-label="Estado de facturación (manual)"
          value={billing}
          onChange={(e) => setBilling(e.target.value)}
          className="w-44"
        >
          {BILLING_STATES.map((state) => (
            <option key={state || "none"} value={state}>
              {state === "" ? "Facturación: sin marcar" : `Facturación: ${state}`}
            </option>
          ))}
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void run("billing", billing)}
          disabled={status.loading}
        >
          Guardar estado
        </Button>
      </div>

      <FormFeedback error={status.error} success={status.success} />
    </div>
  );
}
