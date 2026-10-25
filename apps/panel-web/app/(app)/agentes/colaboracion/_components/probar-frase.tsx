"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { RoutePreview } from "@/lib/api/types";
import { explicarPrueba, mensajeDeError } from "@/lib/colaboracion";

export interface ConexionMin {
  id: string;
  label: string;
}

/**
 * «Probar una frase» (HU-AOS-26): qué agente y qué recorrido atenderían una frase en una conexión,
 * con la versión activa, y por qué. No escribe nada ni gasta: el router es léxico y sin LLM.
 */
export function ProbarFrase({
  conexiones,
  nombresPorKey,
}: {
  conexiones: ConexionMin[];
  nombresPorKey: Record<string, string>;
}) {
  const id = useId();
  const [conexion, setConexion] = useState(conexiones[0]?.id ?? "");
  const [frase, setFrase] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RoutePreview | null>(null);

  if (conexiones.length === 0) {
    return (
      <p className="text-sm text-soft">
        Conecta un canal (WhatsApp, Instagram o el chat web) para probar cómo se reparten las conversaciones.
      </p>
    );
  }

  const probar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frase.trim()) return;
    setPendiente(true);
    setError(null);
    try {
      const res = await fetch("/api/a2a/route-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: conexion, text: frase }),
      });
      const json = (await res.json().catch(() => ({}))) as RoutePreview & { error?: string; code?: string };
      if (!res.ok) {
        setResultado(null);
        setError(mensajeDeError(json.code, typeof json.error === "string" ? json.error : undefined));
        return;
      }
      setResultado(json);
    } catch {
      setError("No se pudo contactar el servidor.");
    } finally {
      setPendiente(false);
    }
  };

  const explicacion = resultado ? explicarPrueba(resultado, nombresPorKey) : null;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={probar} className="flex flex-col gap-3 md:flex-row md:items-end">
        {conexiones.length > 1 && (
          <Field label="Conexión" htmlFor={`${id}-conexion`} className="md:w-56">
            <Select id={`${id}-conexion`} value={conexion} onChange={(e) => setConexion(e.target.value)}>
              {conexiones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Frase de un cliente" htmlFor={`${id}-frase`} className="flex-1">
          <Input
            id={`${id}-frase`}
            value={frase}
            maxLength={2000}
            placeholder="Por ejemplo: quiero agendar una demo"
            onChange={(e) => setFrase(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={pendiente || !frase.trim()}>
          {pendiente ? "Probando…" : "Probar"}
        </Button>
      </form>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-sm text-status-danger-fg">
            {error}
          </p>
        )}
        {explicacion && resultado && (
          <div className="flex flex-col gap-2 rounded-lg border border-border-soft bg-surface p-4 text-sm">
            <p className="text-headline">
              La atendería <strong>{explicacion.agente}</strong>
              {resultado.procedure_id ? <> con el recorrido «{resultado.procedure_title ?? resultado.procedure_id}»</> : null}.
            </p>
            <p className="text-body">{explicacion.porque}</p>
            {resultado.candidates.length > 0 && (
              <div>
                <p className="text-soft">Recorridos que se parecen:</p>
                <ul className="mt-1 list-disc pl-5 text-body">
                  {resultado.candidates.map((c) => (
                    <li key={c.procedure_id}>
                      {c.title ?? c.procedure_id} ({nombresPorKey[c.owner] ?? c.owner}): {Math.round(c.score * 100)} %
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {explicacion.avisos.map((a) => (
              <p key={a} className="rounded-md bg-status-info-bg px-3 py-2 text-body">
                {a}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
