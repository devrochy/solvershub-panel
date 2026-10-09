"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  VARIABLE_DEL_TOKEN,
  errorDeContrasenaNueva,
  tokenDelFragmento,
  type ResultadoDelCanje,
} from "@/lib/acceso";

// El token se lee una vez del fragmento y se guarda aquí: después se borra de la barra de
// direcciones (y del historial) para que no quede a la vista.
let tokenLeido: string | null | undefined;

function leerToken(): string | null {
  if (tokenLeido === undefined) {
    // Lo normal: el script de la página ya lo guardó y borró la URL antes de hidratar.
    const guardado = (window as unknown as Record<string, unknown>)[VARIABLE_DEL_TOKEN];
    tokenLeido = tokenDelFragmento(typeof guardado === "string" ? guardado : window.location.hash);
  }
  return tokenLeido;
}

const sinSuscripcion = () => () => {};

/**
 * Define la contraseña con el enlace de un solo uso y entra al negocio (HU-SH-06). El BFF
 * canjea el token y deja la sesión en una cookie `httpOnly`.
 */
export function InvitacionForm() {
  const router = useRouter();
  // En el servidor no hay fragmento: `undefined` = todavía no se leyó.
  const token = useSyncExternalStore<string | null | undefined>(sinSuscripcion, leerToken, () => undefined);
  const [clave, setClave] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoDelCanje | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (token && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    const invalida = errorDeContrasenaNueva(clave, confirmacion);
    if (invalida) {
      setError(invalida);
      return;
    }
    setEnviando(true);
    setError(null);
    setResultado(null);
    try {
      const res = await fetch("/api/invitacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: clave }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown; resultado?: ResultadoDelCanje };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "No se pudo guardar tu contraseña.");
        setResultado(json.resultado ?? "error");
        setEnviando(false);
        return;
      }
    } catch {
      setError("No se pudo contactar el servidor. Revisa tu conexión e inténtalo de nuevo.");
      setEnviando(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  if (token === undefined) {
    // Primer render (servidor/hidratación): todavía no se leyó el fragmento.
    return (
      <div className="flex flex-col gap-5" aria-hidden>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (token === null) {
    return (
      <div className="flex flex-col gap-4 text-sm text-body">
        <p role="alert">
          Este enlace está incompleto. Ábrelo directo desde el correo de invitación, sin cortarlo.
        </p>
        <p>
          ¿Ya definiste tu contraseña?{" "}
          <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
            Inicia sesión
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Contraseña nueva" htmlFor="clave" help="Mínimo 8 caracteres." required>
        <Input
          id="clave"
          name="clave"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
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
      {(resultado === "cuenta_existente" || resultado === "enlace_invalido") && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
            Iniciar sesión
          </Link>
          <Link href="/recuperar" className="font-medium text-accent underline-offset-4 hover:underline">
            Recuperar mi contraseña
          </Link>
        </p>
      )}

      <Button type="submit" variant="accent" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar y entrar"}
      </Button>
    </form>
  );
}
