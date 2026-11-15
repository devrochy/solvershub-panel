"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { BFF_TWILIO, errorDeJoinCode, mensajeErrorTwilio } from "@/lib/conexion-twilio";
import { toast } from "@/lib/toast-store";

/**
 * Piezas de la ficha de un Sandbox de Twilio (HU-CONN-20): copiar una dirección para pegarla en la consola de
 * Twilio (no hay API para escribirla) y cambiar el código de unión que se muestra para `join <código>`.
 */
export function CopiarTwilio({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar: selecciona el texto y cópialo a mano.");
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void copiar()} aria-label={`Copiar ${etiqueta}`}>
      {copiado ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copiado ? "Copiada" : "Copiar"}
    </Button>
  );
}

export function CodigoDeUnionTwilio({ connectionId, actual }: { connectionId: string; actual: string | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [codigo, setCodigo] = useState(actual ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limpio = codigo.trim().toLowerCase();
    const invalido = limpio ? errorDeJoinCode(limpio) : "Escribe las palabras que siguen a «join».";
    if (invalido) {
      setError(invalido);
      return;
    }
    setGuardando(true);
    setError(null);
    const res = await fetch(`${BFF_TWILIO}/${encodeURIComponent(connectionId)}/sandbox`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ join_code: limpio }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    setGuardando(false);
    if (!res.ok) {
      setError(mensajeErrorTwilio(json.code, json.error ?? "No se pudo guardar el código."));
      return;
    }
    toast.success("Código de unión guardado.");
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(true)}>
        {actual ? "Cambiar código" : "Agregar código"}
      </Button>
    );
  }
  return (
    <form onSubmit={(e) => void guardar(e)} className="flex w-full flex-col gap-2 sm:w-auto" noValidate>
      <Field label="Código de unión" htmlFor={`twilio-join-${connectionId}`}>
        <Input
          id={`twilio-join-${connectionId}`}
          autoComplete="off"
          spellCheck={false}
          placeholder="cloud-forgotten"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
      </Field>
      <FormFeedback error={error} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="accent" size="sm" loading={guardando}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
