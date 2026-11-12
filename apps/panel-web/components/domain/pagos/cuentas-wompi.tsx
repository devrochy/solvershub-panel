"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { Switch } from "@/components/ui/switch";
import type { PaymentAccount } from "@/lib/api/types";
import { toast } from "@/lib/toast-store";

type Formulario = {
  name: string;
  public_key: string;
  private_key: string;
  events_secret: string;
  sandbox: boolean;
};

const VACIO: Formulario = { name: "", public_key: "", private_key: "", events_secret: "", sandbox: true };

/** Lo que se manda: al editar, una llave vacía no se envía (se conserva la guardada). */
export function cuerpoDeCuenta(f: Formulario, editando: boolean): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = { name: f.name.trim(), public_key: f.public_key.trim(), sandbox: f.sandbox };
  if (!editando || f.private_key) cuerpo.private_key = f.private_key;
  if (!editando || f.events_secret) cuerpo.events_secret = f.events_secret;
  return cuerpo;
}

/**
 * Cuentas Wompi del negocio (ADR-0190, HU-AOS-66). Las llaves privadas nunca vuelven del servidor: al editar, dejar
 * una llave vacía la conserva; escribirla la rota para todos los agentes que usan la cuenta.
 */
export function CuentasWompi({ inicial, puedeEditar }: { inicial: PaymentAccount[]; puedeEditar: boolean }) {
  const [cuentas, setCuentas] = useState(inicial);
  const [editando, setEditando] = useState<string | "nueva" | null>(null);
  const [form, setForm] = useState<Formulario>(VACIO);
  const [ocupado, setOcupado] = useState(false);
  const confirmar = useConfirm();

  function abrir(c?: PaymentAccount) {
    setEditando(c ? c.id : "nueva");
    setForm(c ? { ...VACIO, name: c.name, public_key: c.public_key, sandbox: c.sandbox } : VACIO);
  }

  async function llamar(url: string, method: string, body?: unknown) {
    setOcupado(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = res.status === 204 ? null : await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error?.message ?? data?.error ?? "No se pudo guardar la cuenta.");
        return null;
      }
      return data ?? {};
    } finally {
      setOcupado(false);
    }
  }

  async function guardar() {
    const esNueva = editando === "nueva";
    const url = esNueva ? "/api/pack/payments/accounts" : `/api/pack/payments/accounts/${editando}`;
    const data = (await llamar(url, esNueva ? "POST" : "PATCH", cuerpoDeCuenta(form, !esNueva))) as PaymentAccount | null;
    if (!data) return;
    setCuentas((todas) => (esNueva ? [...todas, data] : todas.map((c) => (c.id === data.id ? data : c))));
    setEditando(null);
    toast.success(esNueva ? "Cuenta agregada." : "Cuenta actualizada.");
  }

  async function borrar(c: PaymentAccount) {
    const ok = await confirmar({
      title: `¿Borrar la cuenta «${c.name}»?`,
      description: "Los agentes ya no podrán elegirla. Si algún agente la usa, primero elige otra cuenta en él.",
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    if ((await llamar(`/api/pack/payments/accounts/${c.id}`, "DELETE")) === null) return;
    setCuentas((todas) => todas.filter((x) => x.id !== c.id));
    toast.success("Cuenta borrada.");
  }

  return (
    <div className="flex flex-col gap-4">
      {cuentas.length === 0 && <p className="text-sm text-text-soft">Todavía no tienes cuentas Wompi.</p>}
      <ul className="flex flex-col gap-3">
        {cuentas.map((c) => (
          <li key={c.id} className="flex flex-col gap-2 rounded-md border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-headline">{c.name}</span>
                {c.sandbox ? <Badge variant="warning">Pruebas</Badge> : <Badge variant="success">Producción</Badge>}
              </div>
              {puedeEditar && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => abrir(c)} disabled={ocupado}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => borrar(c)} disabled={ocupado}>
                    Borrar
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-text-soft">
              {c.agent_ids.length === 0
                ? "Ningún agente la usa todavía."
                : `La usa${c.agent_ids.length === 1 ? " 1 agente" : `n ${c.agent_ids.length} agentes`}.`}
            </p>
            <p className="text-sm text-text-soft">
              URL de eventos para pegar en Wompi: <code className="break-all text-headline">{c.events_url}</code>
            </p>
          </li>
        ))}
      </ul>

      {puedeEditar && editando === null && (
        <div>
          <Button onClick={() => abrir()}>Agregar cuenta</Button>
        </div>
      )}

      {editando !== null && (
        <form
          className="flex flex-col gap-3 rounded-md border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void guardar();
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-headline">
            Nombre
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-headline">
            Llave pública
            <Input required value={form.public_key} onChange={(e) => setForm({ ...form, public_key: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-headline">
            Llave privada{editando !== "nueva" && " (déjala vacía para conservarla)"}
            <InputPassword
              required={editando === "nueva"}
              value={form.private_key}
              onChange={(e) => setForm({ ...form, private_key: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-headline">
            Secreto de eventos{editando !== "nueva" && " (déjalo vacío para conservarlo)"}
            <InputPassword
              required={editando === "nueva"}
              value={form.events_secret}
              onChange={(e) => setForm({ ...form, events_secret: e.target.value })}
            />
          </label>
          <div className="flex items-center gap-2">
            <Switch id="cuenta-sandbox" checked={form.sandbox} onCheckedChange={(v) => setForm({ ...form, sandbox: v })} />
            <label htmlFor="cuenta-sandbox" className="text-sm text-headline">
              Cuenta de pruebas (sandbox)
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={ocupado}>
              Guardar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditando(null)} disabled={ocupado}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
