"use client";

import { useEffect, useRef, useState } from "react";

import { AccesibilidadPanel } from "@/app/(app)/configuracion/_components/accesibilidad-panel";
import { AdvancedPanel } from "@/app/(app)/configuracion/_components/advanced-panel";
import { BajasCard } from "@/app/(app)/configuracion/_components/bajas-card";
import { AvisoDatosCard } from "@/app/(app)/configuracion/_components/aviso-datos-card";
import { DatosClienteCard } from "@/app/(app)/configuracion/_components/datos-cliente-card";
import { BrainForm } from "@/app/(app)/configuracion/_components/brain-form";
import { IdentityForm } from "@/app/(app)/configuracion/_components/identity-form";
import { MemoryForm } from "@/app/(app)/configuracion/_components/memory-form";
import { MultimediaForm } from "@/app/(app)/configuracion/_components/multimedia-form";
import { SkillsForm } from "@/app/(app)/configuracion/_components/skills-form";
import { WebChatForm } from "@/app/(app)/configuracion/_components/web-chat-form";
import { WawebCard } from "@/app/(app)/configuracion/_components/waweb-card";
import { MenuDeSecciones } from "@/app/(app)/configuracion/_components/menu-de-secciones";
import { useConfirm } from "@/components/ui/confirm";
import type { AvisoDatos } from "@/lib/aviso-datos";
import { CambiosSinGuardarProvider, useRegistroDeCambios } from "@/lib/cambios-sin-guardar";
import {
  consultaConSeccion,
  resolverSeccion,
  seccionesVisibles,
  seccionPorId,
  SECCIONES_DE_IDENTIDAD,
  type SeccionId,
} from "@/lib/configuracion-secciones";
import type { PoliticaDatos } from "@/lib/datos-cliente";
import type {
  BajasSettings,
  CatalogoConfig,
  MediaSettings,
  SettingsResponse,
  WawebPolitica,
  WebChatSettings,
} from "@/lib/api/types";

type Advanced = {
  versions: { id: string; version: string; is_active: boolean; created_at: string | null }[];
  llm: { llm_provider: string; llm_model: string; has_api_key: boolean };
  guardrails_text: string;
  flow: { source: string; sections: { label: string; purpose: string | null; tools: string[] }[]; unknown_tools: string[] };
  eval_runs: { id: string; status: string; score: number | null; created_at: string | null }[];
  spec: Record<string, unknown>;
};

/**
 * Shell de Configuración: menú por tareas (lateral en escritorio, selector en celular) y el
 * formulario de la sección elegida. La sección vive en la URL (`?seccion=`; `?tab=` y sus alias
 * siguen valiendo) y, si hay cambios sin guardar, cambiar de sección pide confirmación.
 */
export function SettingsTabs({
  defaultTab,
  defaultSeccion,
  settings,
  webChat,
  advanced,
  media,
  catalogo,
  bajas,
  waweb,
  datosCliente,
  puedeEditar = true,
}: {
  /** `?tab=` de la URL (id de la antigua pantalla o alias del panel clásico). */
  defaultTab?: string;
  /** `?seccion=` de la URL; gana a `defaultTab`. */
  defaultSeccion?: string;
  settings: SettingsResponse;
  webChat: WebChatSettings;
  advanced: Advanced;
  media: MediaSettings;
  catalogo: CatalogoConfig | null;
  bajas: BajasSettings | null;
  waweb: WawebPolitica | null;
  /** Política de datos del cliente (HU-CRM-13): `politica` null = no se pudo cargar (`error`). */
  datosCliente: {
    politica: PoliticaDatos | null;
    error?: string;
    puedeEditar: boolean;
    aviso: AvisoDatos | null;
    avisoError?: string;
  };
  /** Quien solo puede ver recibe los formularios sin botones de guardado. */
  puedeEditar?: boolean;
}) {
  const confirm = useConfirm();
  const registro = useRegistroDeCambios();
  const visibles = seccionesVisibles({ waweb: Boolean(waweb && catalogo) });
  const disponibles = new Set(visibles.map((s) => s.id));
  const pedida = resolverSeccion({ seccion: defaultSeccion, tab: defaultTab }, disponibles);
  const [seccion, setSeccion] = useState<SeccionId>(pedida);
  // Si la página se vuelve a pedir con otra sección (un enlace a ?tab=… estando aquí), se sigue la URL.
  const [pedidaAntes, setPedidaAntes] = useState(pedida);
  if (pedida !== pedidaAntes) {
    setPedidaAntes(pedida);
    setSeccion(pedida);
  }
  const titulo = useRef<HTMLHeadingElement>(null);
  const primeraVez = useRef(true);
  const actual = seccionPorId(seccion);
  const esIdentidad = SECCIONES_DE_IDENTIDAD.includes(seccion);

  // Tras cambiar de sección, el foco va al título: el lector de pantalla anuncia dónde quedó.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    titulo.current?.focus();
  }, [seccion]);

  async function irA(id: SeccionId) {
    if (id === seccion) return;
    // Las secciones de identidad comparten un solo formulario, que sigue montado: no se pierde nada.
    const sigueMontado = esIdentidad && SECCIONES_DE_IDENTIDAD.includes(id) ? "identidad" : undefined;
    if (registro.hayCambios(sigueMontado)) {
      const salir = await confirm({
        title: "Tienes cambios sin guardar",
        description: `Si pasas a «${seccionPorId(id).titulo}», se pierde lo que cambiaste en «${actual.titulo}».`,
        confirmLabel: "Descartar cambios",
        cancelLabel: "Seguir editando",
        destructive: true,
      });
      if (!salir) return;
    }
    setSeccion(id);
    // Sin `router`: solo se reescribe la URL (compartible y sobrevive a recargar) sin volver a pedir los datos.
    window.history.replaceState(null, "", consultaConSeccion(window.location.search, id));
  }

  return (
    <CambiosSinGuardarProvider registro={registro}>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-8">
        <MenuDeSecciones secciones={visibles} actual={seccion} onElegir={(id) => void irA(id)} />
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h2 ref={titulo} tabIndex={-1} className="font-display text-lg font-semibold text-headline outline-none">
              {actual.titulo}
            </h2>
            <p className="mt-1 text-sm text-body">{actual.descripcion}</p>
            {actual.grupo === "avanzado" && actual.id !== "accesibilidad" && (
              <p role="note" className="mt-2 text-xs text-text-soft">
                Normalmente no necesitas tocar esto: los valores por defecto funcionan para la mayoría de los negocios.
              </p>
            )}
          </div>

          {esIdentidad && (
            <IdentityForm
              identity={settings.identity}
              catalogo={catalogo}
              seccion={seccion}
              puedeEditar={puedeEditar}
              irASeccion={(id) => void irA(id)}
            />
          )}
          {seccion === "identidad" && bajas && <BajasCard bajas={bajas} catalogo={catalogo} puedeEditar={puedeEditar} />}
          {seccion === "whatsapp-web" && waweb && catalogo && <WawebCard politica={waweb} catalogo={catalogo} />}
          {seccion === "cerebro" && <BrainForm brain={settings.brain} catalogo={catalogo} puedeEditar={puedeEditar} />}
          {seccion === "memoria" && <MemoryForm memory={settings.memory} catalogo={catalogo} puedeEditar={puedeEditar} />}
          {seccion === "herramientas" && <SkillsForm skills={settings.skills} puedeEditar={puedeEditar} />}
          {seccion === "datos-cliente" && (
            <>
              <DatosClienteCard
                politica={datosCliente.politica}
                error={datosCliente.error}
                puedeEditar={datosCliente.puedeEditar}
              />
              <AvisoDatosCard
                aviso={datosCliente.aviso}
                error={datosCliente.avisoError}
                puedeEditar={datosCliente.puedeEditar}
              />
            </>
          )}
          {seccion === "chat-web" && <WebChatForm webChat={webChat} catalogo={catalogo} puedeEditar={puedeEditar} />}
          {seccion === "multimedia" && <MultimediaForm media={media} catalogo={catalogo} puedeEditar={puedeEditar} />}
          {seccion === "agentspec" && <AdvancedPanel advanced={advanced} puedeEditar={puedeEditar} />}
          {seccion === "accesibilidad" && <AccesibilidadPanel />}
        </div>
      </div>
    </CambiosSinGuardarProvider>
  );
}
