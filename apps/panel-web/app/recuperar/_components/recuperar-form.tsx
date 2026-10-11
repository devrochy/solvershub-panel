"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { codigoValido, errorDeContrasenaNueva } from "@/lib/acceso";

type Etapa = "pedir" | "aplicar" | "listo";

const enlace = "font-medium text-link underline-offset-4 hover:underline";

/**
 * Recuperar la contraseña con un código por correo (ADR-0098): primero se pide el código y
 * después se escribe con la contraseña nueva. La respuesta al pedirlo es siempre la misma,
 * exista o no la cuenta. También sirve para definir la primera contraseña de un dueño cuyo
 * enlace de invitación no llegó (runbook de altas en revisión).
 */
export function RecuperarForm() {
  const [etapa, setEtapa] = useState<Etapa>("pedir");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(url: string, datos: Record<string, string>): Promise<boolean> {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: unknown };
        setError(typeof json.error === "string" ? json.error : "Algo salió mal. Inténtalo de nuevo.");
        return false;
      }
      return true;
    } catch {
      setError("No se pudo contactar el servidor. Revisa tu conexión e inténtalo de nuevo.");
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function pedirCodigo(event: FormEvent) {
    event.preventDefault();
    if (!correo.trim()) {
      setError("Escribe tu correo.");
      return;
    }
    if (await enviar("/api/password/forgot", { identifier: correo.trim() })) setEtapa("aplicar");
  }

  async function aplicarCodigo(event: FormEvent) {
    event.preventDefault();
    if (!codigoValido(codigo)) {
      setError("El código tiene 8 letras y números. Cópialo tal cual del correo.");
      return;
    }
    const invalida = errorDeContrasenaNueva(clave, confirmacion);
    if (invalida) {
      setError(invalida);
      return;
    }
    if (await enviar("/api/password/reset", { code: codigo, password: clave, identifier: correo.trim() })) {
      setEtapa("listo");
    }
  }

  if (etapa === "listo") {
    return (
      <div className="flex flex-col gap-4 text-sm text-body">
        <p role="status">Tu contraseña quedó guardada. Ya puedes entrar con ella.</p>
        <Button asChild variant="accent">
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  if (etapa === "aplicar") {
    return (
      <form onSubmit={aplicarCodigo} className="flex flex-col gap-5" noValidate>
        <p role="status" className="text-sm text-body">
          Si {correo.trim()} tiene una cuenta, te enviamos un código de 8 caracteres. Vence en 15 minutos.
        </p>
        <Field label="Código" htmlFor="codigo" required>
          <Input
            id="codigo"
            name="codigo"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </Field>
        <Field label="Contraseña nueva" htmlFor="clave" help="Mínimo 8 caracteres." required>
          <Input
            id="clave"
            name="clave"
            type="password"
            autoComplete="new-password"
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </Field>
        <Field label="Repite la contraseña" htmlFor="confirmacion" required>
          <Input
            id="confirmacion"
            name="confirmacion"
            type="password"
            autoComplete="new-password"
            required
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
          />
        </Field>
        <FormFeedback error={error} />
        <Button type="submit" variant="accent" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar contraseña"}
        </Button>
        <button
          type="button"
          className={`${enlace} self-start text-sm`}
          onClick={() => {
            setEtapa("pedir");
            setError(null);
          }}
        >
          Pedir otro código
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={pedirCodigo} className="flex flex-col gap-5" noValidate>
      <Field label="Correo" htmlFor="correo" required>
        <Input
          id="correo"
          name="correo"
          type="email"
          autoComplete="username"
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
      </Field>
      <FormFeedback error={error} />
      <Button type="submit" variant="accent" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviarme un código"}
      </Button>
      <Link href="/login" className={`${enlace} self-start text-sm`}>
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
