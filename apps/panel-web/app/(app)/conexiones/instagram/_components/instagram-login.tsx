"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { ResultadoConPlan } from "@/components/domain/aviso-limite-de-plan";
import { Button } from "@/components/ui/button";

/**
 * «Conectar con Instagram» (Instagram Login, HU-CHAN-04 ruta b): no hace falta una Página de Facebook. El backend da la
 * dirección de autorización de Instagram (con un `state` de un solo uso atado a este negocio y a quien la pidió); aquí solo
 * se manda el navegador allí. Instagram devuelve a `/conexiones/instagram/callback`.
 */
export function InstagramLogin() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<{ error: string; code?: string }>();

  async function empezar() {
    setCargando(true);
    setError(undefined);
    const res = await fetch("/api/meta/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login_start" }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string; url?: string };
    if (!res.ok || !json.url) {
      // El plan puede no incluir Instagram (`plan_channel_not_included`): sale con «Mejorar mi plan».
      setError({ error: json.error ?? "No se pudo empezar la conexión con Instagram.", code: json.code });
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
      <ResultadoConPlan error={error?.error} code={error?.code} />
      <div>
        <Button variant="accent" disabled={cargando} onClick={() => void empezar()}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          {cargando ? "Abriendo Instagram…" : "Conectar con Instagram"}
        </Button>
      </div>
    </div>
  );
}
