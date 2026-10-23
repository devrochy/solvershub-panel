"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";

/**
 * «Conectar con Instagram» (Instagram Login, HU-CHAN-04 ruta b): no hace falta una Página de Facebook. El backend da la
 * dirección de autorización de Instagram (con un `state` de un solo uso atado a este negocio y a quien la pidió); aquí solo
 * se manda el navegador allí. Instagram devuelve a `/conexiones/instagram/callback`.
 */
export function InstagramLogin() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>();

  async function empezar() {
    setCargando(true);
    setError(undefined);
    const res = await fetch("/api/meta/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login_start" }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
    if (!res.ok || !json.url) {
      setError(json.error ?? "No se pudo empezar la conexión con Instagram.");
      setCargando(false);
      return;
    }
    // Se sale del panel hacia Instagram: no se vuelve a habilitar el botón (la página se descarga).
    window.location.assign(json.url);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-sm text-body">
        Inicia sesión con la propia cuenta de Instagram del negocio y autoriza a SolversHub a leer y responder sus mensajes
        directos. No necesitas una Página de Facebook. La cuenta debe ser profesional (empresa o creador).
      </p>
      <FormFeedback error={error} />
      <div>
        <Button variant="accent" disabled={cargando} onClick={() => void empezar()}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          {cargando ? "Abriendo Instagram…" : "Conectar con Instagram"}
        </Button>
      </div>
    </div>
  );
}
