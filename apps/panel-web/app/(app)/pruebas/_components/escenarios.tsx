"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QaEscenario, QaEscenarioCreado, QaEscenarioResultado, QaEscenarios } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { anclaDe, rutaDeAbrir, textoDelBoton } from "@/lib/qa/escenarios";
import { toast } from "@/lib/toast-store";

import { llamarQa } from "./api";

/**
 * Escenarios de datos de prueba (HU-QA-13): una tarjeta por escenario con qué crea, qué necesita y
 * dónde se ve; «Crear» (o «Crear otro») crea un caso nuevo en el negocio de prueba, sin LLM y sin
 * borrar nada, y «Abrir» cambia a ese negocio y lleva a la página donde se ve.
 */
export function Escenarios({
  inicial,
  datosListos,
  negocioId,
}: {
  inicial: QaEscenarios;
  datosListos: boolean;
  negocioId: string | null;
}) {
  const router = useRouter();
  const [escenarios, setEscenarios] = useState<QaEscenario[]>(inicial.escenarios);
  const [creando, setCreando] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);

  async function crear(slug: string) {
    setCreando(slug);
    const r = await llamarQa<QaEscenarioResultado>(`datos/escenarios/${slug}`, { method: "POST" });
    setCreando(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setEscenarios((lista) => lista.map((e) => (e.slug === slug ? { ...e, ultimo: r.data.creado } : e)));
    toast.success(`Listo: se creó «${r.data.titulo}».`);
  }

  async function abrir(slug: string, ruta: string) {
    if (!negocioId) return;
    setAbriendo(slug);
    try {
      // Lo creado está en el negocio de prueba: primero se cambia a él.
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: negocioId }),
      });
      if (!res.ok) throw new Error("tenant");
      router.push(ruta);
    } catch {
      toast.error("No se pudo cambiar a tu negocio de prueba. Elígelo en el selector de arriba.");
      setAbriendo(null);
    }
  }

  return (
    <section aria-labelledby="escenarios-de-datos" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="escenarios-de-datos" className="font-display text-sh-block text-headline">
          Escenarios
        </h2>
        <p className="max-w-prose text-sm text-body">
          Datos listos con un clic para probar cada módulo, en tu negocio de prueba y sin usar la IA. Cada vez que pulsas
          se crea un caso nuevo y lo anterior se conserva. Para conversar de punta a punta, usa el chat web.
        </p>
      </div>
      {!datosListos && (
        <p className="rounded-md border border-status-info-border bg-status-info-bg p-3 text-sm text-headline" role="status">
          Prepara tus datos primero: los escenarios se crean en tu negocio de prueba.
        </p>
      )}
      <ul aria-label="Escenarios de datos de prueba" className="grid gap-3 lg:grid-cols-2">
        {escenarios.map((e) => (
          <li key={e.slug}>
            <TarjetaDeEscenario
              escenario={e}
              habilitado={datosListos}
              creando={creando === e.slug}
              abriendo={abriendo === e.slug}
              ocupado={creando !== null}
              puedeAbrir={negocioId !== null}
              onCrear={() => crear(e.slug)}
              onAbrir={(ruta) => abrir(e.slug, ruta)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TarjetaDeEscenario({
  escenario,
  habilitado,
  creando,
  abriendo,
  ocupado,
  puedeAbrir,
  onCrear,
  onAbrir,
}: {
  escenario: QaEscenario;
  habilitado: boolean;
  creando: boolean;
  abriendo: boolean;
  ocupado: boolean;
  puedeAbrir: boolean;
  onCrear: () => void;
  onAbrir: (ruta: string) => void;
}) {
  const ultimo = escenario.ultimo ?? null;
  return (
    <article
      id={anclaDe(escenario.slug)}
      aria-labelledby={`${anclaDe(escenario.slug)}-titulo`}
      className="flex h-full scroll-mt-24 flex-col gap-3 rounded-lg border border-border bg-surface p-4 target:border-focus target:ring-2 target:ring-focus/30"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${anclaDe(escenario.slug)}-titulo`} className="font-medium text-headline">
          {escenario.titulo}
        </h3>
        {escenario.agent_os && <Badge>Agent OS</Badge>}
      </div>
      <p className="text-sm text-body">{escenario.crea}</p>
      <dl className="flex flex-col gap-2 text-sm">
        <div>
          <dt className="text-xs font-medium text-text-soft">Dónde se ve</dt>
          <dd className="text-body">{escenario.donde}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-text-soft">Necesita</dt>
          <dd className="text-body">{escenario.requiere}</dd>
        </div>
      </dl>
      {ultimo && <UltimoCaso ultimo={ultimo} />}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button variant="accent" loading={creando} disabled={!habilitado || (ocupado && !creando)} onClick={onCrear}>
          <Plus aria-hidden className="h-4 w-4" />
          {creando ? "Creando…" : textoDelBoton(escenario)}
        </Button>
        {ultimo && rutaDeAbrir(ultimo.ruta) && puedeAbrir && (
          <Button variant="outline" loading={abriendo} onClick={() => onAbrir(rutaDeAbrir(ultimo.ruta) as string)}>
            <ExternalLink aria-hidden className="h-4 w-4" /> Abrir
            <span className="sr-only"> {escenario.titulo} en tu negocio de prueba</span>
          </Button>
        )}
      </div>
    </article>
  );
}

function UltimoCaso({ ultimo }: { ultimo: QaEscenarioCreado }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border-soft bg-surface-2 p-3" role="status">
      <p className="text-xs text-text-soft">
        Último caso{ultimo.creado_en ? ` · ${formatDateTime(ultimo.creado_en)}` : ""} ·{" "}
        <span className="font-mono">{ultimo.sufijo}</span>
      </p>
      <ul className="list-disc space-y-0.5 pl-4 text-sm text-body">
        {ultimo.detalle.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  );
}
