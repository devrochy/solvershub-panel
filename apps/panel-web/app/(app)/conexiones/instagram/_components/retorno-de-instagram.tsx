"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { nombreDeCuenta } from "@/lib/instagram-alta";

type Resultado =
  | { fase: "conectando" }
  | { fase: "listo"; usuario: string | null; id: string; suscrita: boolean }
  | { fase: "error"; mensaje: string };

/**
 * Retorno de Instagram Login: canjea el `code` (con su `state`) en el servidor y muestra el resultado. Lo primero que hace
 * es sacar `code` y `state` de la dirección del navegador (historial, recargas, capturas): el código vale una sola vez.
 */
export function RetornoDeInstagram({ code, state }: { code: string; state: string }) {
  const router = useRouter();
  const [resultado, setResultado] = useState<Resultado>({ fase: "conectando" });
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return; // el modo estricto monta dos veces; el código es de un solo uso
    iniciado.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    // El estado cambia al volver la respuesta, en un callback (no dentro del efecto).
    void Promise.resolve().then(async () => {
      const res = await fetch("/api/meta/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login_complete", code, state }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        ig_user_id?: string;
        username?: string | null;
        subscribed?: boolean;
      };
      if (!res.ok || !json.ig_user_id) {
        setResultado({ fase: "error", mensaje: json.error ?? "No se pudo conectar la cuenta." });
        return;
      }
      setResultado({ fase: "listo", usuario: json.username ?? null, id: json.ig_user_id, suscrita: json.subscribed === true });
      router.refresh();
    });
  }, [code, state, router]);

  if (resultado.fase === "conectando") {
    return (
      <p role="status" className="text-sm text-body">
        Conectando tu cuenta de Instagram…
      </p>
    );
  }
  if (resultado.fase === "error") {
    return (
      <div className="flex flex-col gap-4">
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-status-danger-fg" aria-hidden />
          <p className="text-body">{resultado.mensaje}</p>
        </div>
        <div>
          <Button asChild variant="accent">
            <Link href="/conexiones/instagram">Volver a intentar</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {resultado.suscrita ? (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-status-success-fg" aria-hidden />
          <p className="text-body">
            Tu cuenta {nombreDeCuenta({ ig_user_id: resultado.id, username: resultado.usuario })} quedó conectada y recibiendo
            mensajes.
          </p>
        </div>
      ) : (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-status-warning-fg" aria-hidden />
          <p className="text-body">
            La cuenta {nombreDeCuenta({ ig_user_id: resultado.id, username: resultado.usuario })} quedó guardada, pero Meta no
            confirmó que pueda recibir mensajes. Revisa en Instagram que esté activada «Permitir acceso a los mensajes» y prueba
            la recepción desde la lista de cuentas.
          </p>
        </div>
      )}
      <div>
        <Button asChild variant="accent">
          <Link href="/conexiones/instagram">Ver mis cuentas</Link>
        </Button>
      </div>
    </div>
  );
}
